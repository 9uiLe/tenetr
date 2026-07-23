// Contract 雛形: ビルド済み dist/bin.js を子プロセス起動して外部契約を検証する。
// 事前に pnpm build が必要 (docs/engineering/testing-strategy.md)。
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const binPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../dist/bin.js",
);

const runCli = async (
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> => {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      binPath,
      ...args,
    ]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: e.code ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
};

describe("design-harness bin execution contract", () => {
  it("has a built binary to test against (run pnpm build first)", () => {
    expect(existsSync(binPath)).toBe(true);
  });

  it("exits 4 for a bare invocation and 0 for explicit --help", async () => {
    expect((await runCli([])).code).toBe(4);
    expect((await runCli(["--help"])).code).toBe(0);
  });
});
