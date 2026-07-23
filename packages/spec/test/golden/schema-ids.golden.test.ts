import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SCHEMA_IDS } from "../../src/index.js";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
);

describe("schema id golden", () => {
  it("keeps the published schema id list identical to the committed fixture", () => {
    const fixture = JSON.parse(
      readFileSync(join(fixtureDir, "schema-ids.json"), "utf8"),
    );
    expect([...SCHEMA_IDS]).toEqual(fixture);
  });
});
