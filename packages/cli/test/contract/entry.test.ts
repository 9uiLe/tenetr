import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";

describe("cli entry contract", () => {
  it("exposes an argv-based entry returning a numeric exit code", async () => {
    const code = await run(["--placeholder"]);
    expect(typeof code).toBe("number");
  });
});
