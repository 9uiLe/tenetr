// 再生成: pnpm build && node packages/cli/dist/bin.js resolve --pack examples/num-path/design-philosophy \\
//   --task examples/num-path/task.yaml --out packages/core/test/golden/__fixtures__/declutter-completion-screen.intent.json
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveIntent } from "../../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../../../examples/num-path");

describe("resolve golden (§19.3)", () => {
  it("keeps the design intent contract for the example task identical to the committed fixture", () => {
    const outcome = resolveIntent(
      join(examplesDir, "design-philosophy"),
      join(examplesDir, "task.yaml"),
    );
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.failure));
    const fixture = JSON.parse(
      readFileSync(
        join(here, "__fixtures__", "declutter-completion-screen.intent.json"),
        "utf8",
      ),
    );
    expect(outcome.intent).toEqual(fixture);
  });
});
