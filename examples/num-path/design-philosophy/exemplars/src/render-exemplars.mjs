#!/usr/bin/env node
// generated exemplar renderer — ADR-0003 Q1: 全6事例を同一レンダラー・同一寸法・
// 同一画面シェルから合成する。実プロダクトの資産・文言は含めない。
// 使い方: node render-exemplars.mjs [--chrome <path>]
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const chromeFlag = process.argv.indexOf("--chrome");
const chrome =
  chromeFlag > -1
    ? process.argv[chromeFlag + 1]
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const shellCss = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 390px; height: 844px; }
  body {
    font-family: "Hiragino Sans", "Helvetica Neue", sans-serif;
    background: #eef4f9; color: #1c2a36;
    display: flex; flex-direction: column; padding: 24px 20px 28px;
  }
  .spacer { flex: 1; }
  .header { text-align: center; margin-top: 40px; }
  .check {
    width: 72px; height: 72px; border-radius: 24px; margin: 0 auto 16px;
    background: #34b27d; color: #fff; font-size: 40px; line-height: 72px;
  }
  .title { font-size: 26px; font-weight: 700; }
  .round { font-size: 14px; color: #5b6b78; margin-top: 6px; letter-spacing: 1px; }
  .card {
    background: #fff; border-radius: 16px; padding: 18px; margin-top: 20px;
    box-shadow: 0 1px 2px rgba(28, 42, 54, 0.06);
  }
  .streak-num { font-size: 20px; font-weight: 700; color: #2f7fd4; text-align: center; }
  .streak-sub { font-size: 13px; color: #5b6b78; text-align: center; margin-top: 4px; }
  .week { display: flex; justify-content: space-between; margin-top: 14px; }
  .day { width: 38px; text-align: center; font-size: 11px; color: #8595a2; }
  .cell {
    width: 34px; height: 34px; border-radius: 8px; margin: 4px auto 0;
    background: #e3ebf2;
  }
  .cell.done { background: #34b27d; color: #fff; font-size: 18px; line-height: 34px; }
  .badges { display: flex; gap: 10px; justify-content: center; margin-top: 18px; }
  .badge {
    border: 1px solid #cdd9e2; border-radius: 999px; padding: 6px 14px;
    font-size: 12px; color: #45566578; color: #455665; background: #fff;
  }
  .list-row {
    background: #fff; border-radius: 14px; padding: 16px; margin-top: 14px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 14px; color: #1c2a36;
  }
  .chev { color: #8595a2; }
  .primary {
    display: block; width: 100%; border: 0; border-radius: 16px;
    background: #2f7fd4; color: #fff; font-size: 17px; font-weight: 700;
    padding: 16px; text-align: center;
  }
  .text-link { text-align: center; font-size: 13px; color: #5b6b78; margin-top: 14px; }
`;

const shell = (variantCss, content) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<style>${shellCss}${variantCss}</style></head>
<body>${content}</body></html>`;

const header = `
  <div class="header">
    <div class="check">✓</div>
    <div class="title">今日のパズル 完了</div>
    <div class="round">5 / 5 ラウンド</div>
  </div>`;

const streakCard = `
  <div class="card">
    <div class="streak-num">3日連続で達成中</div>
    <div class="streak-sub">この調子で続けましょう</div>
    <div class="week">
      ${["月", "火", "水", "木", "金", "土", "日"]
        .map(
          (d, i) =>
            `<div class="day">${d}<div class="cell${i >= 3 ? " done" : ""}">${i >= 3 ? "✓" : ""}</div></div>`,
        )
        .join("")}
    </div>
  </div>`;

const primary = (label = "つづける") => `<button class="primary">${label}</button>`;

const variants = {
  "accepted/completion-screen-v3": {
    css: "",
    body: `${header}${streakCard}<div class="spacer"></div>${primary()}<div class="text-link">きょうの記録を見る</div>`,
  },
  "accepted/completion-screen-v4": {
    css: "",
    body: `${header}${streakCard}
      <div class="list-row">詳細を見る(バッジ・統計)<span class="chev">›</span></div>
      <div class="spacer"></div>${primary()}`,
  },
  "accepted/completion-screen-v5": {
    css: `.check { background: #6f5bd6; } .streak-num { color: #6f5bd6; }
          .cell.done { background: #6f5bd6; }`,
    body: `${header}${streakCard}<div class="spacer"></div>${primary()}<div class="text-link">きょうの記録を見る</div>`,
  },
  "rejected/completion-screen-v1": {
    css: `body { background: linear-gradient(160deg, #ff9de2, #7bd5ff 45%, #fff6a3); }
      .confetti { position: absolute; font-size: 26px; }
      .primary.share { background: #e0498a; margin-top: 12px; }`,
    body: `
      <div class="confetti" style="top:70px;left:30px">🎉</div>
      <div class="confetti" style="top:130px;right:40px">✨</div>
      <div class="confetti" style="top:330px;left:60px">🎊</div>
      <div class="confetti" style="top:470px;right:70px">🎉</div>
      <div class="confetti" style="top:610px;left:40px">✨</div>
      ${header}${streakCard}<div class="spacer"></div>
      ${primary()}<button class="primary share">シェアする</button>`,
  },
  "rejected/completion-screen-v2": {
    css: `.stats { display: flex; gap: 10px; margin-top: 14px; }
      .stat { flex: 1; background: #fff; border-radius: 12px; padding: 12px 8px;
              text-align: center; font-size: 11px; color: #5b6b78; }
      .stat b { display: block; font-size: 17px; color: #1c2a36; margin-bottom: 2px; }
      .card { margin-top: 14px; padding: 14px; }
      .header { margin-top: 8px; }
      .check { width: 56px; height: 56px; line-height: 56px; font-size: 30px; }`,
    body: `${header}${streakCard}
      <div class="badges"><span class="badge">ミスなし</span><span class="badge">ヒント未使用</span><span class="badge">自己ベスト</span></div>
      <div class="stats"><div class="stat"><b>824</b>今日のスコア</div><div class="stat"><b>951</b>最高記録</div><div class="stat"><b>42</b>累計クリア</div></div>
      <div class="list-row">週間ランキング 12位<span class="chev">›</span></div>
      <div class="list-row">リマインダーを設定<span class="chev">›</span></div>
      <div class="list-row">プレミアムで広告なし<span class="chev">›</span></div>
      <div class="spacer"></div>${primary()}`,
  },
  "rejected/completion-screen-v6": {
    css: `.primary {
        background: linear-gradient(90deg, #ff2fd2, #2ffff2);
        border-radius: 999px; border: 3px solid #fff700;
        box-shadow: 0 0 18px #ff2fd2, 0 0 30px #2ffff2;
        text-shadow: 0 0 6px #ffffff;
      }
      .card { border-radius: 4px 28px 4px 28px; border: 2px dashed #ff2fd2; }
      .text-link { color: #ff2fd2; text-decoration: underline wavy; }`,
    body: `${header}${streakCard}<div class="spacer"></div>${primary("つづける ▶▶")}<div class="text-link">きょうの記録を見る</div>`,
  },
};

const tmp = mkdtempSync(join(tmpdir(), "exemplar-"));
for (const [rel, v] of Object.entries(variants)) {
  const html = join(tmp, `${rel.replace("/", "-")}.html`);
  writeFileSync(html, shell(v.css, v.body));
  const out = join(here, "..", `${rel}.png`);
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(chrome, [
    "--headless=new",
    `--screenshot=${out}`,
    "--window-size=390,844",
    "--force-device-scale-factor=2",
    "--hide-scrollbars",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-lcd-text",
    `file://${html}`,
  ]);
  console.log(`rendered ${rel}.png`);
}
rmSync(tmp, { recursive: true, force: true });
