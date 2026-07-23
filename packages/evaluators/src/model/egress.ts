import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { ModelEvaluationRequest, ModelImage } from "./transport.js";

export interface MaskRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EgressPolicy {
  policy_version: string;
  allowed_purposes: ModelImage["purpose"][];
  mask_regions: MaskRegion[];
}

export interface EgressImage extends ModelImage {
  bytes: Buffer;
  masked: boolean;
  sent_sha256: string;
}

export interface EgressAuditImage {
  id: string;
  purpose: string;
  source_sha256: string;
  sent_sha256: string;
  masked: boolean;
}

export interface EgressAudit {
  policy_version: string;
  principle: string;
  images: EgressAuditImage[];
  payload_sha256: string;
}

export class EgressBlockedError extends Error {}

// 外部モデル送信前の唯一の検査点 (ADR-0005 Q3)。deny-by-default:
// 許可 purpose 外・整合性不一致・PNG 以外は fail-closed で遮断し、呼び出し側は
// モデル評価を無効化する (縮退しても決定的評価は動く §22.3)。
export function prepareEgress(
  request: ModelEvaluationRequest,
  policy: EgressPolicy,
): { images: EgressImage[]; audit: EgressAudit } {
  const images: EgressImage[] = [];
  const auditImages: EgressAuditImage[] = [];

  for (const image of request.images) {
    if (!policy.allowed_purposes.includes(image.purpose)) {
      throw new EgressBlockedError(
        `image purpose not allowlisted: ${image.id} (${image.purpose})`,
      );
    }
    const bytes = readFileSync(image.path);
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== image.sha256) {
      throw new EgressBlockedError(
        `image integrity mismatch for ${image.id}: expected ${image.sha256}, got ${actual}`,
      );
    }

    const shouldMask = image.purpose === "after" || image.purpose === "before";
    let sentBytes: Buffer = bytes;
    let masked = false;
    if (shouldMask && policy.mask_regions.length > 0) {
      sentBytes = applyMasks(bytes, policy.mask_regions, image.id);
      masked = true;
    }
    const sentSha = createHash("sha256").update(sentBytes).digest("hex");
    images.push({ ...image, bytes: sentBytes, masked, sent_sha256: sentSha });
    auditImages.push({
      id: image.id,
      purpose: image.purpose,
      source_sha256: image.sha256,
      sent_sha256: sentSha,
      masked,
    });
  }

  const payloadDigest = createHash("sha256");
  payloadDigest.update(
    JSON.stringify({
      principle: request.principle,
      task: request.task,
      constraints: request.constraints,
      exemplars: request.exemplars,
    }),
  );
  for (const image of images) {
    payloadDigest.update(image.sent_sha256);
  }

  return {
    images,
    audit: {
      policy_version: policy.policy_version,
      principle: request.principle.id,
      images: auditImages,
      payload_sha256: payloadDigest.digest("hex"),
    },
  };
}

function applyMasks(
  bytes: Buffer,
  regions: MaskRegion[],
  imageId: string,
): Buffer {
  let png: PNG;
  try {
    png = PNG.sync.read(bytes);
  } catch (error) {
    // Why not: PNG 以外はそのまま送る選択もある | Reason: マスク不能な形式の送信は
    // §20.1 の制御を素通りさせるため fail-closed で遮断する
    throw new EgressBlockedError(
      `cannot mask non-PNG image ${imageId}: ${(error as Error).message}`,
    );
  }
  for (const region of regions) {
    const x0 = Math.floor(region.x * png.width);
    const y0 = Math.floor(region.y * png.height);
    const x1 = Math.min(
      png.width,
      Math.ceil((region.x + region.width) * png.width),
    );
    const y1 = Math.min(
      png.height,
      Math.ceil((region.y + region.height) * png.height),
    );
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 255;
      }
    }
  }
  return PNG.sync.write(png);
}
