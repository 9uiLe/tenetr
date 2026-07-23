import { describe, expect, it } from "vitest";
import { HARNESS_VERSION } from "../../src/index.js";

describe("core package", () => {
  it("exposes a semver harness version for the run manifest", () => {
    expect(HARNESS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
