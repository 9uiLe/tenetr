import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePack = (name: string): string =>
  join(here, "__fixtures__", "packs", name);
const examplePack = join(
  here,
  "../../../../examples/num-path/design-philosophy",
);

const collectIo = (): CliIo & { lines: string[]; errors: string[] } => {
  const lines: string[] = [];
  const errors: string[] = [];
  return {
    lines,
    errors,
    out: (line) => lines.push(line),
    err: (line) => errors.push(line),
  };
};

describe("design-harness validate exit code contract (§10.2)", () => {
  it("exits 0 for the committed example pack", async () => {
    const io = collectIo();
    await expect(run(["validate", "--pack", examplePack], io)).resolves.toBe(0);
  });

  it("exits 1 with a specific message for a schema violation", async () => {
    const io = collectIo();
    await expect(
      run(["validate", "--pack", fixturePack("schema-violation")], io),
    ).resolves.toBe(1);
    expect(io.errors.join("\n")).toContain("observable_signals");
  });

  it("exits 2 with the unknown id named for a broken reference", async () => {
    const io = collectIo();
    await expect(
      run(["validate", "--pack", fixturePack("broken-ref")], io),
    ).resolves.toBe(2);
    expect(io.errors.join("\n")).toContain("sample-ghost");
  });

  it("exits 3 for a semantic contradiction (missing judgment pair)", async () => {
    const io = collectIo();
    await expect(
      run(["validate", "--pack", fixturePack("semantic")], io),
    ).resolves.toBe(3);
    expect(io.errors.join("\n")).toContain("missing judgment case");
  });

  it("exits 4 for a nonexistent pack directory", async () => {
    const io = collectIo();
    await expect(
      run(["validate", "--pack", fixturePack("does-not-exist")], io),
    ).resolves.toBe(4);
  });

  it("exits 4 for an unknown command (usage errors do not collide with contract codes)", async () => {
    const io = collectIo();
    await expect(run(["frobnicate"], io)).resolves.toBe(4);
  });

  it("exits 0 for explicit --help", async () => {
    const io = collectIo();
    await expect(run(["--help"], io)).resolves.toBe(0);
  });
});
