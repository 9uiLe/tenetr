import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";

const silentIo = { out: () => {}, err: () => {} };

describe("cli package", () => {
  it("resolves exit code 4 for a bare invocation (usage error, not a contract code)", async () => {
    await expect(run([], silentIo)).resolves.toBe(4);
  });
});
