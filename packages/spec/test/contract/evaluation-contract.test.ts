import type { ValidateFunction } from "ajv/dist/2020.js";
import Ajv2020 from "ajv/dist/2020.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSchema } from "../../src/index.js";

let validate: ValidateFunction;

const validEvaluation = () => ({
  schema_version: "1.0",
  run_id: "run-2026-07-24-001",
  summary: {
    deterministic: { pass: 8, fail: 0 },
    model: { pass: 3, warn: 1 },
    human_review: 1,
  },
  findings: [
    {
      id: "finding-001",
      evaluator: "visual-primary-action",
      principle: "focus.single-primary-decision",
      kind: "model",
      verdict: "warn",
      confidence: 0.84,
      observations: [
        { type: "visual", fact: "主操作と副操作の幅が同じである" },
      ],
      judgment: "副操作の視覚的重要度がまだ高い",
      remediation: "副操作の幅、塗り、配置のいずれかを弱める",
      evidence: [
        {
          type: "image_region",
          artifact: "artifacts/completion-screen.png",
          region: { x: 0.08, y: 0.72, width: 0.84, height: 0.18 },
        },
      ],
    },
  ],
});

beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true });
  validate = ajv.compile(loadSchema("evaluation"));
});

describe("evaluation schema", () => {
  it("accepts a §14-shaped evaluation result", () => {
    const doc = validEvaluation();
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
  });

  it("rejects a fail finding that carries no evidence", () => {
    const doc = validEvaluation();
    const finding = doc.findings[0] as Record<string, unknown>;
    finding.kind = "deterministic";
    finding.verdict = "fail";
    finding.evidence = [];
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("evidence");
  });

  it("rejects a model finding with verdict fail (model must not fail CI)", () => {
    const doc = validEvaluation();
    (doc.findings[0] as Record<string, unknown>).verdict = "fail";
    expect(validate(doc)).toBe(false);
  });

  it("rejects a model finding without confidence", () => {
    const doc = validEvaluation();
    delete (doc.findings[0] as Record<string, unknown>).confidence;
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("confidence");
  });

  it("rejects confidence outside the 0..1 range", () => {
    const doc = validEvaluation();
    (doc.findings[0] as Record<string, unknown>).confidence = 1.5;
    expect(validate(doc)).toBe(false);
  });

  it("rejects an image_region evidence without region coordinates", () => {
    const doc = validEvaluation();
    const evidence = (
      doc.findings[0] as { evidence: Record<string, unknown>[] }
    ).evidence;
    if (evidence[0]) delete evidence[0].region;
    expect(validate(doc)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain("region");
  });
});
