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
const tmp = mkdtempSync(join(tmpdir(), "tenetr-evaluate-"));

const producer = (name: string, elementsJson: string): string => {
  const script = join(tmp, `${name}.mjs`);
  writeFileSync(
    script,
    `import { writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
writeFileSync(join(out, "screenshot.png"), "png-bytes");
writeFileSync(join(out, "ui-snapshot.json"), JSON.stringify({
  schema_version: "1.0",
  scenario: process.env.SCENARIO_ID,
  screen: { width: 1320, height: 2868, scale: 3 },
  source: { tool: "fake", raw_artifact: "" },
  elements: ${elementsJson},
}));
writeFileSync(join(out, "capture-result.json"), JSON.stringify({
  scenario: process.env.SCENARIO_ID,
  artifacts: ["screenshot.png", "ui-snapshot.json"],
}));
`,
  );
  const profiles = join(tmp, `${name}-profiles.yaml`);
  writeFileSync(
    profiles,
    `profiles:\n  default:\n    command: ["${process.execPath}", "${script}"]\n`,
  );
  return profiles;
};

const GOOD_ELEMENTS = `[
  { id: "el-primary", role: "button", label: "つづける", frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] },
  { id: "el-link", role: "text", label: "きょうの記録を見る", frame: { x: 0.3, y: 0.85, width: 0.4, height: 0.02 } }
]`;

const COMPETING_ELEMENTS = `[
  { id: "el-primary", role: "button", label: "つづける", frame: { x: 0.05, y: 0.8, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] },
  { id: "el-share", role: "button", label: "シェアする", frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] }
]`;

let intentFile: string;

beforeAll(async () => {
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
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness evaluate contract (§10.5, §13)", () => {
  it("passes the gate for a single dominant primary action", async () => {
    const artifacts = join(tmp, "good");
    await run(
      [
        "capture",
        "--pack",
        examplePack,
        "--scenario",
        "completed",
        "--profiles",
        producer("good", GOOD_ELEMENTS),
        "--out",
        artifacts,
      ],
      silentIo,
    );
    const out = join(tmp, "good-evaluation.json");
    await expect(
      run(
        [
          "evaluate",
          "--pack",
          examplePack,
          "--intent",
          intentFile,
          "--artifacts",
          artifacts,
          "--out",
          out,
        ],
        silentIo,
      ),
    ).resolves.toBe(0);
    const evaluation = JSON.parse(readFileSync(out, "utf8"));
    expect(evaluation.summary.deterministic.fail).toBe(0);
    expect(evaluation.run_id).toMatch(/^run-[a-f0-9]{12}$/);
  });

  it("fails the gate with evidence when two primary actions compete", async () => {
    const artifacts = join(tmp, "bad");
    await run(
      [
        "capture",
        "--pack",
        examplePack,
        "--scenario",
        "completed",
        "--profiles",
        producer("bad", COMPETING_ELEMENTS),
        "--out",
        artifacts,
      ],
      silentIo,
    );
    const out = join(tmp, "bad-evaluation.json");
    await expect(
      run(
        [
          "evaluate",
          "--pack",
          examplePack,
          "--intent",
          intentFile,
          "--artifacts",
          artifacts,
          "--out",
          out,
        ],
        silentIo,
      ),
    ).resolves.toBe(1);
    const evaluation = JSON.parse(readFileSync(out, "utf8"));
    expect(evaluation.summary.deterministic.fail).toBeGreaterThan(0);
    for (const finding of evaluation.findings) {
      if (finding.verdict === "fail") {
        expect(finding.evidence?.length).toBeGreaterThan(0);
      }
    }
  });

  it("produces byte-identical evaluations for the same artifacts (§22.2)", async () => {
    const artifacts = join(tmp, "good");
    const out1 = join(tmp, "repeat-1.json");
    const out2 = join(tmp, "repeat-2.json");
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
        out1,
      ],
      silentIo,
    );
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
        out2,
      ],
      silentIo,
    );
    expect(readFileSync(out1, "utf8")).toBe(readFileSync(out2, "utf8"));
  });

  it("merges model findings via a module transport and never fails the gate on model warn (§13.2)", async () => {
    const transportModule = join(tmp, "stub-transport.mjs");
    writeFileSync(
      transportModule,
      `export default () => ({
  id: "stub",
  send: () => Promise.resolve({
    verdict: "warn",
    confidence: 0.9,
    observations: [{ type: "visual", fact: "副操作の視覚的重みが高い" }],
    judgment: "階層が Intent と部分的に不一致",
    evidence_regions: [{ x: 0.1, y: 0.8, width: 0.8, height: 0.1 }],
  }),
});
`,
    );
    const artifacts = join(tmp, "good");
    const out = join(tmp, "model-evaluation.json");
    await expect(
      run(
        [
          "evaluate",
          "--pack",
          examplePack,
          "--intent",
          intentFile,
          "--artifacts",
          artifacts,
          "--out",
          out,
          "--model-transport",
          `module:${transportModule}`,
        ],
        silentIo,
      ),
    ).resolves.toBe(0);
    const evaluation = JSON.parse(readFileSync(out, "utf8"));
    expect(evaluation.summary.model.warn).toBeGreaterThan(0);
    const modelFinding = evaluation.findings.find(
      (f: { kind: string }) => f.kind === "model",
    );
    expect(modelFinding?.confidence).toBe(0.9);
    const audit = JSON.parse(
      readFileSync(join(artifacts, "egress-audit.json"), "utf8"),
    );
    expect(audit.audits.length).toBeGreaterThan(0);
    expect(audit.audits[0].payload_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("exits 2 when artifacts belong to a different scenario than the intent", async () => {
    const artifacts = join(tmp, "mismatch");
    writeFileSync(join(tmp, "mismatch-manifest-dir"), "");
    const dir = join(tmp, "mismatch-artifacts");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "capture-manifest.json"),
      JSON.stringify({ scenario: "other-scenario", artifacts: [] }),
    );
    await expect(
      run(
        [
          "evaluate",
          "--pack",
          examplePack,
          "--intent",
          intentFile,
          "--artifacts",
          dir,
          "--out",
          join(tmp, "x.json"),
        ],
        silentIo,
      ),
    ).resolves.toBe(2);
  });
});
