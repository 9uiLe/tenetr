import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run } from "../../src/index.js";
import type { CliIo } from "../../src/io.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplePack = join(
  here,
  "../../../../examples/num-path/design-philosophy",
);
const silentIo: CliIo = { out: () => {}, err: () => {} };
const tmp = mkdtempSync(join(tmpdir(), "tenetr-capture-"));

const fakeProducer = join(tmp, "fake-capture.mjs");
const profilesFile = join(tmp, "profiles.yaml");

beforeAll(() => {
  writeFileSync(
    fakeProducer,
    `import { writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
writeFileSync(join(out, "screenshot.png"), "png-bytes");
writeFileSync(join(out, "env-dump.json"), JSON.stringify(process.env));
writeFileSync(join(out, "ui-snapshot.json"), JSON.stringify({
  schema_version: "1.0",
  scenario: process.env.SCENARIO_ID,
  screen: { width: 1320, height: 2868, scale: 3 },
  source: { tool: "fake-capture", raw_artifact: "" },
  elements: [
    { id: "el-primary", role: "button", label: "つづける", frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, hittable: true, traits: ["primary"] },
  ],
}));
writeFileSync(join(out, "capture-result.json"), JSON.stringify({
  schema_version: "1.0",
  scenario: process.env.SCENARIO_ID,
  environment: { device: "fake-sim" },
  artifacts: ["screenshot.png", "ui-snapshot.json", "env-dump.json"],
  tool: "fake-capture",
}));
`,
  );
  writeFileSync(
    profilesFile,
    `profiles:\n  default:\n    command: ["${process.execPath}", "${fakeProducer}"]\n    timeout_seconds: 60\n`,
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("design-harness capture contract (§10.4, ADR-0005)", () => {
  it("captures artifacts, hashes them, and hides non-allowlisted env from the producer", async () => {
    process.env.SECRET_LEAK_CHECK = "must-not-appear";
    const out = join(tmp, "run1");
    await expect(
      run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "completed",
          "--profiles",
          profilesFile,
          "--out",
          out,
        ],
        silentIo,
      ),
    ).resolves.toBe(0);

    const manifest = JSON.parse(
      readFileSync(join(out, "capture-manifest.json"), "utf8"),
    );
    expect(manifest.scenario).toBe("completed");
    expect(manifest.profile).toBe("default");
    expect(manifest.environment.device).toBe("fake-sim");
    const paths = manifest.artifacts.map((a: { path: string }) => a.path);
    expect(paths).toContain("screenshot.png");
    expect(paths).toContain("ui-snapshot.json");
    for (const artifact of manifest.artifacts) {
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    }

    const childEnv = JSON.parse(
      readFileSync(join(out, "env-dump.json"), "utf8"),
    );
    expect(childEnv.SECRET_LEAK_CHECK).toBeUndefined();
    expect(childEnv.SCENARIO_ID).toBe("completed");
    expect(childEnv.PATH).toBeDefined();
  });

  it("exits 2 for a scenario id not declared in the pack", async () => {
    await expect(
      run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "nonexistent",
          "--profiles",
          profilesFile,
          "--out",
          join(tmp, "run2"),
        ],
        silentIo,
      ),
    ).resolves.toBe(2);
  });

  it("exits 4 when the trusted profiles file lacks the scenario's profile", async () => {
    const empty = join(tmp, "empty-profiles.yaml");
    writeFileSync(empty, 'profiles:\n  other:\n    command: ["true"]\n');
    await expect(
      run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "completed",
          "--profiles",
          empty,
          "--out",
          join(tmp, "run3"),
        ],
        silentIo,
      ),
    ).resolves.toBe(4);
  });

  it("exits 4 when the producer omits a required artifact", async () => {
    const lazy = join(tmp, "lazy.mjs");
    writeFileSync(
      lazy,
      `import { writeFileSync } from "node:fs";
import { join } from "node:path";
writeFileSync(join(process.env.OUT_DIR, "capture-result.json"), JSON.stringify({ scenario: process.env.SCENARIO_ID, artifacts: [] }));
`,
    );
    const lazyProfiles = join(tmp, "lazy-profiles.yaml");
    writeFileSync(
      lazyProfiles,
      `profiles:\n  default:\n    command: ["${process.execPath}", "${lazy}"]\n`,
    );
    await expect(
      run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "completed",
          "--profiles",
          lazyProfiles,
          "--out",
          join(tmp, "run4"),
        ],
        silentIo,
      ),
    ).resolves.toBe(4);
  });

  it("exits 1 when the producer emits a schema-violating ui snapshot", async () => {
    const bad = join(tmp, "bad-snapshot.mjs");
    writeFileSync(
      bad,
      `import { writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
writeFileSync(join(out, "screenshot.png"), "png-bytes");
writeFileSync(join(out, "ui-snapshot.json"), JSON.stringify({ schema_version: "1.0", elements: [] }));
writeFileSync(join(out, "capture-result.json"), JSON.stringify({ scenario: process.env.SCENARIO_ID, artifacts: ["screenshot.png"] }));
`,
    );
    const badProfiles = join(tmp, "bad-profiles.yaml");
    writeFileSync(
      badProfiles,
      `profiles:\n  default:\n    command: ["${process.execPath}", "${bad}"]\n`,
    );
    await expect(
      run(
        [
          "capture",
          "--pack",
          examplePack,
          "--scenario",
          "completed",
          "--profiles",
          badProfiles,
          "--out",
          join(tmp, "run5"),
        ],
        silentIo,
      ),
    ).resolves.toBe(1);
  });
});
