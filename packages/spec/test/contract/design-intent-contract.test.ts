import type { ValidateFunction } from "ajv/dist/2020.js";
import Ajv2020 from "ajv/dist/2020.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadSchema } from "../../src/index.js";

let validate: ValidateFunction;

const validIntent = () => ({
  schema_version: "1.0",
  task: {
    id: "declutter-completion-screen",
    description:
      "日次完了画面の初期表示を必要最小限にし、次の行動が迷わず1つに定まるようにする。",
    scenario: "completed",
  },
  classification: "improve-existing-screen",
  applicable_principles: [
    {
      id: "focus.single-primary-decision",
      reason: "主操作の一意化がタスクの中心",
    },
    {
      id: "information.minimal-first-view",
      reason: "初期表示の削減がタスクの中心",
    },
  ],
  referenced_exemplars: [
    { id: "completion-screen-v3", relation: "follow" },
    { id: "completion-screen-v1", relation: "avoid" },
  ],
  tradeoff_resolutions: [],
  unresolved_items: [
    {
      id: "reminder-placement",
      question: "リマインダー導線を開示の背後へ移してよいか",
      blocking: false,
      default_answer: "開示の背後へ移す",
    },
  ],
  acceptance_criteria: ["主操作スタイルのコントロールが1つだけ存在する"],
  constraints: ["完了の事実と連続記録は残す"],
  ready_to_implement: true,
  ready_blockers: [],
});

beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true });
  validate = ajv.compile(loadSchema("design-intent"));
});

describe("design intent schema", () => {
  it("accepts a ready-to-implement contract with principles and criteria", () => {
    const doc = validIntent();
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
  });

  it("rejects ready_to_implement=true with remaining blockers", () => {
    const doc = validIntent();
    doc.ready_blockers = ["blocking の未解決事項が残っている"];
    expect(validate(doc)).toBe(false);
  });

  it("rejects ready_to_implement=true without acceptance criteria", () => {
    const doc = validIntent();
    doc.acceptance_criteria = [];
    expect(validate(doc)).toBe(false);
  });

  it("rejects ready_to_implement=false without stated blockers", () => {
    const doc = validIntent();
    doc.ready_to_implement = false;
    doc.ready_blockers = [];
    expect(validate(doc)).toBe(false);
  });
});
