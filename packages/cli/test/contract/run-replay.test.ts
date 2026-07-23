import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../../../examples/num-path");
const examplePack = join(examplesDir, "design-philosophy");
const exampleTask = join(examplesDir, "task.yaml");
const silentIo: CliIo = { out: () => {}, err: () => {} };
const tmp = mkdtempSync(join(tmpdir(), "tenetr-run-"));
const runDir = join(tmp, "run-1");

beforeAll(async () => {
  const producerScript = join(tmp, "producer.mjs");
  writeFileSync(
    producerScript,
    `import { writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
writeFileSync(join(out, "screenshot.png"), "png-bytes");
writeFileSync(join(out, "ui-snapshot.json"), JSON.stringify({
  schema_version: "1.0",
  scenario: process.env.SCENARIO_ID,
  screen: { width: 1320, height: 2868, scale: 3 },
  source: { tool: "fake", raw_artifact: "" },
  elements: [
    { id: "el-a", role: "button", label: "つづける", frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] }
  ],
}));
writeFileSync(join(out, "capture-result.json"), JSON.stringify({
  scenario: process.env.SCENARIO_ID,
  environment: { device: "fake-sim", locale: "ja-JP", appearance: "light" },
  artifacts: ["screenshot.png", "ui-snapshot.json"],
  tool: "fake-capture",
}));
`,
  );
  const profiles = join(tmp, "profiles.yaml");
  writeFileSync(
    profiles,
    `profiles:\n  default:\n    command: ["${process.execPath}", "${producerScript}"]\n`,
  );
  await run(
    [
      "run",
      "--pack",
      examplePack,
      "--task",
      exampleTask,
      "--scenario",
      "completed",
      "--profiles",
      profiles,
      "--out",
      runDir,
    ],
    silentIo,
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness run + replay contract (§10.7, §15)", () => {
  it("produces intent, artifacts, evaluation, reports and a schema-valid manifest", () => {
    for (const file of [
      "intent.json",
      "artifacts/capture-manifest.json",
      "evaluation.json",
      "report.html",
      "report.json",
      "run-manifest.json",
    ]) {
      expect(readFileSync(join(runDir, file), "utf8").length).toBeGreaterThan(
        0,
      );
    }
    const manifest = JSON.parse(
      readFileSync(join(runDir, "run-manifest.json"), "utf8"),
    );
    expect(manifest.versions.philosophy_pack).toBe("0.1.0");
    expect(manifest.versions.philosophy_pack_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.capture.locale).toBe("ja-JP");
    expect(manifest.model_evaluation.enabled).toBe(false);
    expect(manifest.source.commit).toMatch(/^[a-f0-9]{7,40}$/);
  });

  it("replays a recorded run and confirms byte-identical evaluation (§22.3)", async () => {
    await expect(
      run(
        [
          "replay",
          "--manifest",
          join(runDir, "run-manifest.json"),
          "--pack",
          examplePack,
        ],
        silentIo,
      ),
    ).resolves.toBe(0);
  });

  it("detects artifact tampering with exit 2", async () => {
    const target = join(runDir, "artifacts", "ui-snapshot.json");
    const original = readFileSync(target, "utf8");
    writeFileSync(target, original.replace("つづける", "改ざん"));
    try {
      await expect(
        run(
          [
            "replay",
            "--manifest",
            join(runDir, "run-manifest.json"),
            "--pack",
            examplePack,
          ],
          silentIo,
        ),
      ).resolves.toBe(2);
    } finally {
      writeFileSync(target, original);
    }
  });
});
