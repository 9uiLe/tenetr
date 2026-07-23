import { writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
writeFileSync(join(out, "screenshot.png"), "golden-png-bytes");
writeFileSync(
  join(out, "ui-snapshot.json"),
  JSON.stringify({
    schema_version: "1.0",
    scenario: process.env.SCENARIO_ID,
    screen: { width: 1320, height: 2868, scale: 3 },
    source: { tool: "golden-fixture", raw_artifact: "" },
    elements: [
      {
        id: "el-primary",
        role: "button",
        label: "つづける",
        identifier: "primary-action",
        frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 },
        hittable: true,
        traits: ["primary"],
      },
      {
        id: "el-detail",
        role: "button",
        label: "詳細を見る",
        frame: { x: 0.3, y: 0.82, width: 0.4, height: 0.05 },
        hittable: true,
      },
    ],
  }),
);
writeFileSync(
  join(out, "capture-result.json"),
  JSON.stringify({
    scenario: process.env.SCENARIO_ID,
    environment: { device: "golden-sim" },
    artifacts: ["screenshot.png", "ui-snapshot.json"],
    tool: "golden-fixture",
  }),
);
