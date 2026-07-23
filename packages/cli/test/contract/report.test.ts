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
const tmp = mkdtempSync(join(tmpdir(), "tenetr-report-"));

let artifacts: string;
let intentFile: string;
let evaluationFile: string;

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
    { id: "el-a", role: "button", label: "つづける", frame: { x: 0.05, y: 0.8, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] },
    { id: "el-b", role: "button", label: "シェアする", frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] }
  ],
}));
writeFileSync(join(out, "capture-result.json"), JSON.stringify({
  scenario: process.env.SCENARIO_ID,
  environment: { device: "fake-sim", locale: "ja-JP" },
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
  intentFile = join(tmp, "intent.json");
  await run(
    [
      "resolve",
      "--pack",
      examplePack,
      "--task",
      exampleTask,
      "--out",
      intentFile,
    ],
    silentIo,
  );
  artifacts = join(tmp, "artifacts");
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
  evaluationFile = join(tmp, "evaluation.json");
  await run(
    [
      "evaluate",
      "--pack",
      examplePack,
      "--intent",
      intentFile,
      "--artifacts",
      artifacts,
      "--out",
      evaluationFile,
    ],
    silentIo,
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness report contract (§10.6, §17)", () => {
  it("renders all 11 required sections in order with region overlays (html)", async () => {
    const out = join(tmp, "report.html");
    await expect(
      run(
        [
          "report",
          "--evaluation",
          evaluationFile,
          "--intent",
          intentFile,
          "--artifacts",
          artifacts,
          "--out",
          out,
          "--format",
          "html",
          "--pack-version",
          "0.1.0",
        ],
        silentIo,
      ),
    ).resolves.toBe(0);
    const html = readFileSync(out, "utf8");
    const sections = [
      "run-summary",
      "task",
      "design-intent",
      "before-after",
      "principles",
      "deterministic-findings",
      "model-findings",
      "human-review",
      "evidence",
      "reproduction",
      "artifacts",
    ];
    let cursor = -1;
    for (const section of sections) {
      const index = html.indexOf(`id="${section}"`);
      expect(index, `section ${section} present and ordered`).toBeGreaterThan(
        cursor,
      );
      cursor = index;
    }
    expect(html).toContain('class="region');
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain("focus.single-primary-decision");
    expect(html.indexOf("FAIL")).toBeLessThan(html.indexOf("<details>"));
  });

  it("emits a json report whose findings are sorted worst-first", async () => {
    const out = join(tmp, "report.json");
    await expect(
      run(
        [
          "report",
          "--evaluation",
          evaluationFile,
          "--intent",
          intentFile,
          "--artifacts",
          artifacts,
          "--out",
          out,
          "--format",
          "json",
        ],
        silentIo,
      ),
    ).resolves.toBe(0);
    const report = JSON.parse(readFileSync(out, "utf8"));
    expect(report.findings[0].verdict).toBe("fail");
    expect(report.reproduction.scenario).toBe("completed");
    expect(report.versions.harness).toBeDefined();
  });
});
