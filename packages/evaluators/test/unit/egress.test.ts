import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { afterAll, describe, expect, it } from "vitest";
import type { EgressPolicy, ModelEvaluationRequest } from "../../src/index.js";
import { EgressBlockedError, prepareEgress } from "../../src/index.js";

const tmp = mkdtempSync(join(tmpdir(), "tenetr-egress-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const makePng = (name: string): { path: string; sha256: string } => {
  const png = new PNG({ width: 10, height: 10 });
  png.data.fill(255);
  const bytes = PNG.sync.write(png);
  const path = join(tmp, name);
  writeFileSync(path, bytes);
  return { path, sha256: createHash("sha256").update(bytes).digest("hex") };
};

const request = (
  images: ModelEvaluationRequest["images"],
): ModelEvaluationRequest => ({
  principle: {
    id: "focus.single-primary-decision",
    title: "t",
    statement: "s",
    rationale: "r",
    observable_signals: [],
    model_checks: ["c"],
  },
  task: { description: "d", scenario: "completed" },
  constraints: [],
  exemplars: [],
  images,
  responseSchema: {},
});

const policy = (overrides: Partial<EgressPolicy> = {}): EgressPolicy => ({
  policy_version: "1.0",
  allowed_purposes: ["after", "exemplar-accepted", "exemplar-rejected"],
  mask_regions: [],
  ...overrides,
});

describe("prepareEgress (ADR-0005 Q3)", () => {
  it("blocks images whose purpose is not allowlisted (fail-closed)", () => {
    const img = makePng("before.png");
    expect(() =>
      prepareEgress(
        request([{ id: "before", purpose: "before", ...img }]),
        policy(),
      ),
    ).toThrow(EgressBlockedError);
  });

  it("blocks images whose bytes do not match the declared hash", () => {
    const img = makePng("after-tampered.png");
    expect(() =>
      prepareEgress(
        request([
          {
            id: "after",
            purpose: "after",
            path: img.path,
            sha256: "0".repeat(64),
          },
        ]),
        policy(),
      ),
    ).toThrow(/integrity mismatch/);
  });

  it("applies declared mask regions to captured images and records both hashes", () => {
    const img = makePng("after.png");
    const { images, audit } = prepareEgress(
      request([{ id: "after", purpose: "after", ...img }]),
      policy({ mask_regions: [{ x: 0, y: 0, width: 0.5, height: 0.5 }] }),
    );
    const sent = images[0];
    expect(sent?.masked).toBe(true);
    expect(sent?.sent_sha256).not.toBe(img.sha256);
    const masked = PNG.sync.read(sent?.bytes as Buffer);
    expect(masked.data[0]).toBe(0);
    const lastIdx = (masked.width * masked.height - 1) << 2;
    expect(masked.data[lastIdx]).toBe(255);
    expect(audit.images[0]?.source_sha256).toBe(img.sha256);
    expect(audit.images[0]?.sent_sha256).toBe(sent?.sent_sha256);
    expect(audit.payload_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not mask exemplar images (synthetic, mask-free by policy)", () => {
    const img = makePng("exemplar.png");
    const { images } = prepareEgress(
      request([{ id: "exemplar-x", purpose: "exemplar-accepted", ...img }]),
      policy({ mask_regions: [{ x: 0, y: 0, width: 1, height: 1 }] }),
    );
    expect(images[0]?.masked).toBe(false);
    expect(images[0]?.sent_sha256).toBe(img.sha256);
  });

  it("blocks non-PNG bytes when masking is required", () => {
    const path = join(tmp, "not-png.png");
    writeFileSync(path, "not a png");
    const sha = createHash("sha256").update("not a png").digest("hex");
    expect(() =>
      prepareEgress(
        request([{ id: "after", purpose: "after", path, sha256: sha }]),
        policy({ mask_regions: [{ x: 0, y: 0, width: 1, height: 1 }] }),
      ),
    ).toThrow(/cannot mask/);
  });
});
