import { describe, expect, it } from "vitest";
import { SCHEMA_IDS } from "../../src/index.js";

describe("spec package", () => {
  it("declares exactly the four schema contracts fixed by the design guide", () => {
    expect(SCHEMA_IDS).toEqual([
      "philosophy-pack",
      "design-intent",
      "evaluation",
      "run-manifest",
      "ui-snapshot",
    ]);
  });
});
