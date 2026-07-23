import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";

describe("cli package", () => {
  it("resolves exit code 0 for the placeholder entry point", async () => {
    await expect(run([])).resolves.toBe(0);
  });
});
