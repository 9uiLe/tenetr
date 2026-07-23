import type { ValidateFunction } from "ajv/dist/2020.js";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSchema } from "../../src/index.js";

let validate: ValidateFunction;

const sha = "a".repeat(64);

const validManifest = () => ({
  schema_version: "1.0",
  run_id: "run-2026-07-24-001",
  started_at: "2026-07-24T18:45:00+09:00",
  completed_at: "2026-07-24T18:48:12+09:00",
  versions: {
    philosophy_pack: "0.1.0",
    philosophy_pack_sha256: sha,
    harness: "0.1.0",
  },
  source: {
    repository: "9uiLe/tenetr",
    commit: "c6c39160000",
    dirty: false,
  },
  task: { file: "task.yaml", sha256: sha },
  intent: { file: "intent.json", sha256: sha },
  capture: {
    scenario: "completed",
    locale: "ja-JP",
    appearance: "light",
  },
  model_evaluation: {
    enabled: false,
  },
  artifacts: [{ path: "artifacts/completion-screen.png", sha256: sha }],
  evaluation: { file: "evaluation.json", sha256: sha },
});

beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  validate = ajv.compile(loadSchema("run-manifest"));
});

describe("run manifest schema", () => {
  it("accepts a §15-shaped manifest with model evaluation disabled", () => {
    const doc = validManifest();
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
  });

  it("requires provider, model and masking_applied when model evaluation is enabled", () => {
    const doc = validManifest();
    doc.model_evaluation = { enabled: true } as never;
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("masking_applied");
  });

  it("rejects a malformed artifact sha256", () => {
    const doc = validManifest();
    if (doc.artifacts[0]) doc.artifacts[0].sha256 = "not-a-hash";
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("pattern");
  });

  it("rejects a manifest without evaluation reference", () => {
    const doc = validManifest() as Record<string, unknown>;
    delete doc.evaluation;
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("evaluation");
  });
});
