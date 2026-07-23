import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const silentIo: CliIo = { out: () => {}, err: () => {} };
const tmp = mkdtempSync(join(tmpdir(), "tenetr-init-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness init contract (§10.1)", () => {
  it("generates a scaffold that immediately passes validate", async () => {
    await expect(run(["init", "--dir", tmp], silentIo)).resolves.toBe(0);
    await expect(
      run(["validate", "--pack", join(tmp, "design-philosophy")], silentIo),
    ).resolves.toBe(0);
  });

  it("refuses to overwrite an existing scaffold with exit 4", async () => {
    await expect(run(["init", "--dir", tmp], silentIo)).resolves.toBe(4);
  });
});
