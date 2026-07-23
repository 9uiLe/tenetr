import { describe, expect, it } from "vitest";
import { CAPTURE_PLATFORM } from "../../src/index.js";

describe("ios-adapter package", () => {
  it("targets the iOS simulator as the only MVP capture platform", () => {
    expect(CAPTURE_PLATFORM).toBe("ios-simulator");
  });
});
