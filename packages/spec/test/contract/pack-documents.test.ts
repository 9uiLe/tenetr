import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv/dist/2020.js";
import Ajv2020 from "ajv/dist/2020.js";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadSchema, packDocumentRef } from "../../src/index.js";

const packDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../examples/num-path/design-philosophy",
);

const loadYaml = (rel: string): unknown =>
  parse(readFileSync(join(packDir, rel), "utf8"));

let ajv: Ajv2020;
const validator = (
  kind: Parameters<typeof packDocumentRef>[0],
): ValidateFunction => {
  const v = ajv.getSchema(packDocumentRef(kind));
  if (!v) throw new Error(`no validator for ${kind}`);
  return v;
};

beforeAll(() => {
  ajv = new Ajv2020({ allErrors: true });
  ajv.addSchema(loadSchema("philosophy-pack"));
});

describe("philosophy pack schema vs example pack", () => {
  it("accepts the committed pack manifest", () => {
    const v = validator("packManifest");
    expect(v(loadYaml("pack.yaml")), JSON.stringify(v.errors)).toBe(true);
  });

  it("accepts the committed principles document", () => {
    const v = validator("principlesDocument");
    expect(v(loadYaml("principles.yaml")), JSON.stringify(v.errors)).toBe(true);
  });

  it("accepts the committed exemplars index", () => {
    const v = validator("exemplarsDocument");
    expect(v(loadYaml("exemplars/index.yaml")), JSON.stringify(v.errors)).toBe(
      true,
    );
  });

  it("accepts the committed expected judgments", () => {
    const v = validator("expectedJudgmentsDocument");
    expect(
      v(loadYaml("expected-judgments.yaml")),
      JSON.stringify(v.errors),
    ).toBe(true);
  });
});

describe("philosophy pack schema rejects invalid documents with specific errors", () => {
  it("rejects a principle without observable_signals", () => {
    const v = validator("principlesDocument");
    const doc = loadYaml("principles.yaml") as {
      principles: Record<string, unknown>[];
    };
    delete doc.principles[0]?.observable_signals;
    expect(v(doc)).toBe(false);
    expect(JSON.stringify(v.errors)).toContain("observable_signals");
  });

  it("rejects a judgment case with a verdict outside the 5-value vocabulary", () => {
    const v = validator("expectedJudgmentsDocument");
    const doc = loadYaml("expected-judgments.yaml") as {
      cases: Record<string, unknown>[];
    };
    if (doc.cases[0]) doc.cases[0].expected_verdict = "maybe";
    expect(v(doc)).toBe(false);
    expect(JSON.stringify(v.errors)).toContain("expected_verdict");
  });

  it("rejects an exemplar that neither supports nor violates any principle", () => {
    const v = validator("exemplarsDocument");
    const doc = loadYaml("exemplars/index.yaml") as {
      exemplars: Record<string, unknown>[];
    };
    if (doc.exemplars[0]) doc.exemplars[0].principles = {};
    expect(v(doc)).toBe(false);
    expect(JSON.stringify(v.errors)).toContain("principles");
  });

  it("rejects a pack manifest missing the expected_judgments file entry", () => {
    const v = validator("packManifest");
    const doc = loadYaml("pack.yaml") as { files: Record<string, unknown> };
    delete doc.files.expected_judgments;
    expect(v(doc)).toBe(false);
    expect(JSON.stringify(v.errors)).toContain("expected_judgments");
  });
});
