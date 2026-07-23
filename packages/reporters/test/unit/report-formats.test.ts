import { describe, expect, it } from "vitest";
import { REPORT_FORMATS } from "../../src/index.js";

describe("reporters package", () => {
  it("supports the two report formats required for the MVP", () => {
    expect(REPORT_FORMATS).toEqual(["json", "html"]);
  });
});
