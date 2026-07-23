import { describe, expect, it } from "vitest";
import { EVALUATOR_KINDS } from "../../src/index.js";

describe("evaluators package", () => {
  it("separates evaluation into the three layers required by the design guide", () => {
    expect(EVALUATOR_KINDS).toEqual(["deterministic", "model", "human"]);
  });
});
