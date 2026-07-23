// CI 用 capture producer: #3 で取得済みの committed before 画像を成果物として提供する。
// 実機 capture は macOS runner + アプリ側リポジトリの撮影基盤で行う (§18.4)。
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const out = process.env.OUT_DIR;
copyFileSync("examples/num-path/scenarios/completed/before.png", join(out, "screenshot.png"));
writeFileSync(
  join(out, "capture-result.json"),
  JSON.stringify({
    scenario: process.env.SCENARIO_ID,
    environment: { device: "iphone-simulator", locale: "ja-JP", appearance: "light" },
    artifacts: ["screenshot.png"],
    tool: "committed-before-image",
    tool_version: "issue-3-evidence",
  }),
);
