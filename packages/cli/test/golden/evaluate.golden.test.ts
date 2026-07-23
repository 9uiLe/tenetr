// 再生成手順: このテストの GOLDEN_REGENERATE=1 実行で __fixtures__/expected-evaluation.json を更新し、
// 差分が意図どおりであることを確認してコミットする (docs/engineering/testing-strategy.md)。
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../../../examples/num-path");
const examplePack = join(examplesDir, "design-philosophy");
const exampleTask = join(examplesDir, "task.yaml");
const producerScript = join(here, "__fixtures__", "evaluate-producer.mjs");
const expectedPath = join(here, "__fixtures__", "expected-evaluation.json");
const silentIo: CliIo = { out: () => {}, err: () => {} };

describe("evaluate golden (§19.3, Issue #15)", () => {
  it("keeps the full evaluation for the golden capture identical to the committed fixture", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "tenetr-golden-"));
    try {
      const profiles = join(tmp, "profiles.yaml");
      writeFileSync(
        profiles,
        `profiles:\n  default:\n    command: ["${process.execPath}", "${producerScript}"]\n`,
      );
      const intent = join(tmp, "intent.json");
      await run(
        [
          "resolve",
          "--pack",
          examplePack,
          "--task",
          exampleTask,
          "--out",
          intent,
        ],
        silentIo,
      );
      const artifacts = join(tmp, "artifacts");
      await run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "completed",
          "--profiles",
          profiles,
          "--out",
          artifacts,
        ],
        silentIo,
      );
      const out = join(tmp, "evaluation.json");
      const code = await run(
        [
          "evaluate",
          "--pack",
          examplePack,
          "--intent",
          intent,
          "--artifacts",
          artifacts,
          "--out",
          out,
        ],
        silentIo,
      );
      expect(code).toBe(0);
      const produced = readFileSync(out, "utf8");
      if (process.env.GOLDEN_REGENERATE === "1") {
        writeFileSync(expectedPath, produced);
      }
      expect(produced).toBe(readFileSync(expectedPath, "utf8"));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
