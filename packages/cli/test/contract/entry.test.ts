import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";

const silentIo = { out: () => {}, err: () => {} };

describe("cli entry contract", () => {
  it("returns exit 4 for an unknown option instead of commander's default 1", async () => {
    const code = await run(["--placeholder"], silentIo);
    expect(code).toBe(4);
  });
});
