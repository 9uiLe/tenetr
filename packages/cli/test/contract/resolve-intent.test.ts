import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../../../examples/num-path");
const examplePack = join(examplesDir, "design-philosophy");
const exampleTask = join(examplesDir, "task.yaml");

const silentIo: CliIo = { out: () => {}, err: () => {} };
const tmp = mkdtempSync(join(tmpdir(), "tenetr-resolve-"));

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness resolve contract (§10.3)", () => {
  it("produces a ready-to-implement intent for the example pack and task", async () => {
    const out = join(tmp, "intent.json");
    await expect(
      run(
        ["resolve", "--pack", examplePack, "--task", exampleTask, "--out", out],
        silentIo,
      ),
    ).resolves.toBe(0);
    const intent = JSON.parse(readFileSync(out, "utf8"));
    expect(intent.classification).toBe("improve-existing-screen");
    expect(
      intent.applicable_principles.map((p: { id: string }) => p.id),
    ).toEqual([
      "focus.single-primary-decision",
      "information.minimal-first-view",
      "expression.no-artificial-excitement",
      "consistency.use-established-components",
      "brand.expression-within-usability",
    ]);
    expect(intent.referenced_exemplars).toContainEqual({
      id: "completion-screen-v1",
      relation: "avoid",
    });
    expect(intent.ready_to_implement).toBe(true);
    expect(intent.ready_blockers).toEqual([]);
  });

  it("marks the intent not ready when a blocking open question remains (§9.3)", async () => {
    const blockedTask = join(tmp, "blocked-task.yaml");
    writeFileSync(
      blockedTask,
      `${readFileSync(exampleTask, "utf8")}  - id: kpi-priority
    question: シェア導線と継続導線のどちらを優先するか
    blocking: true
`,
    );
    const out = join(tmp, "blocked-intent.json");
    await expect(
      run(
        ["resolve", "--pack", examplePack, "--task", blockedTask, "--out", out],
        silentIo,
      ),
    ).resolves.toBe(0);
    const intent = JSON.parse(readFileSync(out, "utf8"));
    expect(intent.ready_to_implement).toBe(false);
    expect(intent.ready_blockers.join(" ")).toContain("kpi-priority");
  });

  it("exits 1 for a malformed task definition", async () => {
    const badTask = join(tmp, "bad-task.yaml");
    writeFileSync(
      badTask,
      "schema_version: '1.0'\nid: Bad_ID\ndescription: x\nscenario: completed\n",
    );
    const out = join(tmp, "unused.json");
    await expect(
      run(
        ["resolve", "--pack", examplePack, "--task", badTask, "--out", out],
        silentIo,
      ),
    ).resolves.toBe(1);
  });

  it("exits 4 for a missing task file", async () => {
    await expect(
      run(
        [
          "resolve",
          "--pack",
          examplePack,
          "--task",
          join(tmp, "nope.yaml"),
          "--out",
          join(tmp, "x.json"),
        ],
        silentIo,
      ),
    ).resolves.toBe(4);
  });
});
