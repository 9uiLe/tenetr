import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import type {
  BuilderArtifacts,
  BuilderIntent,
  ModelEvaluationRequest,
  PackModelData,
  ProviderTransport,
} from "../../src/index.js";
import { buildModelRequests, runModelEvaluation } from "../../src/index.js";

const pack: PackModelData = {
  principles: [
    {
      id: "focus.single-primary-decision",
      title: "主判断を1つに限定する",
      statement: "s",
      rationale: "r",
      observable_signals: ["sig"],
      checks: { model: ["主操作が一意に認識できるか"] },
      exemplars: { supports: ["good-a"], violates: ["bad-a"] },
    },
    {
      id: "consistency.use-established-components",
      title: "t",
      statement: "s",
      rationale: "r",
      observable_signals: ["sig"],
      checks: { model: [] },
    },
  ],
  exemplars: [
    {
      id: "good-a",
      status: "accepted",
      artifact: "accepted/good-a.png",
      rationale: "良い",
    },
    {
      id: "bad-a",
      status: "rejected",
      artifact: "rejected/bad-a.png",
      rationale: "悪い",
    },
    {
      id: "other",
      status: "accepted",
      artifact: "accepted/other.png",
      rationale: "無関係",
    },
  ],
};

const shaFor = (name: string): string =>
  name.charCodeAt(0).toString(16).padStart(2, "0").repeat(32);
const imgDir = mkdtempSync(join(tmpdir(), "tenetr-model-test-"));
const realPng = (
  name: string,
  seed: number,
): { path: string; sha256: string } => {
  const png = new PNG({ width: 4, height: 4 });
  png.data.fill(seed);
  const bytes = PNG.sync.write(png);
  const path = join(imgDir, `${name}.png`);
  writeFileSync(path, bytes);
  return { path, sha256: createHash("sha256").update(bytes).digest("hex") };
};
const realAfter = realPng("after", 10);
const realGood = realPng("good-a", 20);
const realBad = realPng("bad-a", 30);
const realImages: Record<string, { path: string; sha256: string }> = {
  "good-a": realGood,
  "bad-a": realBad,
};
const artifacts: BuilderArtifacts = {
  afterImage: realAfter,
  exemplarImage: (id) =>
    realImages[id] ?? { path: join(imgDir, `${id}.png`), sha256: shaFor(id) },
};
const runOptions = {
  confidenceThreshold: 0.7,
  egressPolicy: {
    policy_version: "1.0",
    allowed_purposes: ["after", "exemplar-accepted", "exemplar-rejected"] as (
      | "after"
      | "before"
      | "exemplar-accepted"
      | "exemplar-rejected"
    )[],
    mask_regions: [],
  },
};

const intent: BuilderIntent = {
  task: { description: "d", scenario: "completed" },
  constraints: ["完了の事実を残す"],
  applicablePrincipleIds: [
    "focus.single-primary-decision",
    "consistency.use-established-components",
  ],
};

const stubTransport = (
  respond: (r: ModelEvaluationRequest) => unknown,
): ProviderTransport => ({
  id: "stub",
  send: (r) => Promise.resolve(respond(r)),
});

describe("buildModelRequests", () => {
  it("creates one request per principle that declares model checks", () => {
    const requests = buildModelRequests(pack, intent, artifacts);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.principle.id).toBe("focus.single-primary-decision");
  });

  it("includes only the exemplar images referenced by the principle", () => {
    const request = buildModelRequests(pack, intent, artifacts)[0];
    const ids = request?.images.map((i) => i.id);
    expect(ids).toEqual(["after", "exemplar-good-a", "exemplar-bad-a"]);
  });

  it("excludes exemplars whose image hash equals the evaluated image (label leakage, ADR-0006)", () => {
    const leaky: BuilderArtifacts = {
      afterImage: realGood,
      exemplarImage: (id) =>
        realImages[id] ?? {
          path: join(imgDir, `${id}.png`),
          sha256: shaFor(id),
        },
    };
    const request = buildModelRequests(pack, intent, leaky)[0];
    const ids = request?.images.map((i) => i.id);
    expect(ids).toEqual(["after", "exemplar-bad-a"]);
  });
});

describe("runModelEvaluation", () => {
  const requests = buildModelRequests(pack, intent, artifacts);

  it("returns a model finding from a schema-conformant response", async () => {
    const transport = stubTransport(() => ({
      verdict: "warn",
      confidence: 0.9,
      observations: [{ type: "visual", fact: "副操作が目立つ" }],
      judgment: "副操作の重みが高い",
      evidence_regions: [{ x: 0.1, y: 0.8, width: 0.8, height: 0.1 }],
    }));
    const findings = await runModelEvaluation(requests, transport, runOptions);
    expect(findings[0]?.verdict).toBe("warn");
    expect(findings[0]?.kind).toBe("model");
    expect(findings[0]?.evidence?.[0]?.type).toBe("image_region");
  });

  it("escalates to human_review below the confidence threshold (§12.4)", async () => {
    const transport = stubTransport(() => ({
      verdict: "pass",
      confidence: 0.5,
      observations: [{ type: "visual", fact: "判断が難しい" }],
      judgment: "おそらく問題ない",
    }));
    const findings = await runModelEvaluation(requests, transport, runOptions);
    expect(findings[0]?.verdict).toBe("human_review");
  });

  it("returns unknown instead of repairing a schema-violating response", async () => {
    const transport = stubTransport(() => ({ verdict: "fail", confidence: 2 }));
    const findings = await runModelEvaluation(requests, transport, runOptions);
    expect(findings[0]?.verdict).toBe("unknown");
    expect(findings[0]?.confidence).toBe(0);
  });

  it("returns unknown when the transport call fails", async () => {
    const transport: ProviderTransport = {
      id: "stub",
      send: () => Promise.reject(new Error("network down")),
    };
    const findings = await runModelEvaluation(requests, transport, runOptions);
    expect(findings[0]?.verdict).toBe("unknown");
  });
});
