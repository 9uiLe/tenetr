// モデル出力を強制する schema (§12.3, §14)。verdict に fail が無いのは §13.2 の
// 「モデル評価は CI を停止しない」をレスポンス段階で封じるため (evaluation スキーマ側でも強制)。
export const MODEL_RESPONSE_SCHEMA: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["verdict", "confidence", "observations", "judgment"],
  additionalProperties: false,
  properties: {
    verdict: { enum: ["pass", "warn", "unknown", "human_review"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    observations: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["type", "fact"],
        additionalProperties: false,
        properties: {
          type: { const: "visual" },
          fact: { type: "string", minLength: 1 },
        },
      },
    },
    judgment: { type: "string", minLength: 1 },
    remediation: { type: "string" },
    evidence_regions: {
      type: "array",
      items: {
        type: "object",
        required: ["x", "y", "width", "height"],
        additionalProperties: false,
        properties: {
          x: { type: "number", minimum: 0, maximum: 1 },
          y: { type: "number", minimum: 0, maximum: 1 },
          width: { type: "number", minimum: 0, maximum: 1 },
          height: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};
