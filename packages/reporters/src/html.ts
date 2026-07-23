import type { ReportData } from "./report-data.js";
import { sortFindingsForDisplay } from "./report-data.js";

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const VERDICT_LABEL: Record<string, string> = {
  fail: "FAIL",
  human_review: "HUMAN REVIEW",
  warn: "WARN",
  unknown: "UNKNOWN",
  pass: "PASS",
};

export function renderHtml(data: ReportData): string {
  const findings = sortFindingsForDisplay(data.evaluation.findings);
  const attention = findings.filter((f) => f.verdict !== "pass");
  const passed = findings.filter((f) => f.verdict === "pass");
  const humanReview = findings.filter((f) => f.verdict === "human_review");
  const summary = data.evaluation.summary;

  const regionOverlays = (findingId: string): string => {
    const finding = findings.find((f) => f.id === findingId);
    return (finding?.evidence ?? [])
      .filter((e) => e.type === "image_region" && e.region)
      .map((e) => {
        const r = e.region as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        return `<div class="region ${esc(finding?.verdict)}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.width * 100}%;height:${r.height * 100}%"></div>`;
      })
      .join("");
  };

  const allOverlays = attention.map((f) => regionOverlays(f.id)).join("");

  const findingCard = (finding: (typeof findings)[number]): string => `
    <article class="finding ${esc(finding.verdict)}">
      <header>
        <span class="badge">${esc(VERDICT_LABEL[finding.verdict] ?? finding.verdict)}</span>
        <strong>${esc(finding.evaluator)}</strong>
        ${finding.principle ? `<code>${esc(finding.principle)}</code>` : ""}
        ${finding.confidence !== undefined ? `<span class="conf">confidence ${esc(finding.confidence)}</span>` : ""}
      </header>
      <dl>
        <dt>観測事実</dt>
        <dd><ul>${finding.observations.map((o) => `<li>[${esc(o.type)}] ${esc(o.fact)}</li>`).join("")}</ul></dd>
        <dt>判断</dt>
        <dd>${esc(finding.judgment)}</dd>
        ${finding.remediation ? `<dt>修正提案${finding.principle ? ` (${esc(finding.principle)})` : ""}</dt><dd>${esc(finding.remediation)}</dd>` : ""}
      </dl>
    </article>`;

  const img = (
    image: { mimeType: string; base64: string } | undefined,
    overlays: string,
  ): string =>
    image
      ? `<div class="shot"><img src="data:${image.mimeType};base64,${image.base64}" alt="screenshot" />${overlays}</div>`
      : "<p>(画像なし)</p>";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>Design Harness Report — ${esc(data.run_id)}</title>
<style>
  body { font-family: "Hiragino Sans", sans-serif; margin: 0 auto; max-width: 960px; padding: 24px; color: #1c2a36; }
  h2 { border-bottom: 2px solid #e3ebf2; padding-bottom: 4px; margin-top: 32px; }
  .finding { border: 1px solid #d5dee6; border-left-width: 6px; border-radius: 8px; padding: 12px 16px; margin: 10px 0; }
  .finding.fail { border-left-color: #d64545; }
  .finding.human_review { border-left-color: #8a5cd6; }
  .finding.warn { border-left-color: #e2a03f; }
  .finding.unknown { border-left-color: #8595a2; }
  .finding.pass { border-left-color: #34b27d; padding: 6px 16px; }
  .badge { font-weight: 700; margin-right: 8px; }
  .conf { color: #5b6b78; margin-left: 8px; font-size: 0.85em; }
  .shot { position: relative; display: inline-block; max-width: 320px; }
  .shot img { width: 100%; display: block; border: 1px solid #d5dee6; border-radius: 8px; }
  .region { position: absolute; border: 3px solid #d64545; background: rgba(214, 69, 69, 0.15); }
  .region.warn { border-color: #e2a03f; background: rgba(226, 160, 63, 0.15); }
  .region.human_review { border-color: #8a5cd6; background: rgba(138, 92, 214, 0.15); }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #d5dee6; padding: 4px 10px; text-align: left; }
  .pass-list li { color: #45766a; }
  code { background: #eef4f9; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<h1>Design Philosophy Harness Report</h1>

<section id="run-summary">
<h2>1. Run Summary</h2>
<table>
<tr><th>Run ID</th><td>${esc(data.run_id)}</td></tr>
<tr><th>Deterministic</th><td>pass ${summary.deterministic.pass} / fail ${summary.deterministic.fail} / unknown ${summary.deterministic.unknown ?? 0}</td></tr>
<tr><th>Model</th><td>pass ${summary.model.pass} / warn ${summary.model.warn} / unknown ${summary.model.unknown ?? 0}</td></tr>
<tr><th>Human Review</th><td>${summary.human_review}</td></tr>
</table>
</section>

<section id="task">
<h2>2. Task</h2>
<p><strong>${esc(data.intent.task.id)}</strong>: ${esc(data.intent.task.description)}</p>
<p>scenario: <code>${esc(data.intent.task.scenario)}</code>${data.intent.task.screen ? ` / 画面: ${esc(data.intent.task.screen)}` : ""}</p>
</section>

<section id="design-intent">
<h2>3. Design Intent</h2>
<p>classification: <code>${esc(data.intent.classification)}</code> / ready_to_implement: <strong>${data.intent.ready_to_implement}</strong></p>
<ul>${(data.intent.acceptance_criteria ?? []).map((c) => `<li>受け入れ条件: ${esc(c)}</li>`).join("")}</ul>
<ul>${(data.intent.constraints ?? []).map((c) => `<li>制約: ${esc(c)}</li>`).join("")}</ul>
<ul>${data.intent.unresolved_items.map((u) => `<li>未解決 (${u.blocking ? "blocking" : "non-blocking"}): ${esc(u.question)}</li>`).join("")}</ul>
</section>

<section id="before-after">
<h2>4. Before / After</h2>
<table><tr>
<td><strong>Before</strong><br/>${img(data.images.before, "")}</td>
<td><strong>After (問題領域をハイライト)</strong><br/>${img(data.images.after, allOverlays)}</td>
</tr></table>
</section>

<section id="principles">
<h2>5. Applicable Principles</h2>
<ul>${data.intent.applicable_principles.map((p) => `<li><code>${esc(p.id)}</code> — ${esc(p.reason)}</li>`).join("")}</ul>
</section>

<section id="deterministic-findings">
<h2>6. Deterministic Findings</h2>
${
  findings
    .filter((f) => f.kind === "deterministic" && f.verdict !== "pass")
    .map(findingCard)
    .join("") || "<p>指摘なし</p>"
}
<details><summary>Pass (${passed.filter((f) => f.kind === "deterministic").length})</summary>
<ul class="pass-list">${passed
    .filter((f) => f.kind === "deterministic")
    .map((f) => `<li>${esc(f.evaluator)}: ${esc(f.judgment)}</li>`)
    .join("")}</ul>
</details>
</section>

<section id="model-findings">
<h2>7. Model Findings</h2>
${
  findings
    .filter((f) => f.kind === "model" && f.verdict !== "pass")
    .map(findingCard)
    .join("") || "<p>指摘なし (モデル評価が無効の場合もここに何も出ない)</p>"
}
<details><summary>Pass (${passed.filter((f) => f.kind === "model").length})</summary>
<ul class="pass-list">${passed
    .filter((f) => f.kind === "model")
    .map(
      (f) =>
        `<li>${esc(f.evaluator)}: ${esc(f.judgment)} (confidence ${esc(f.confidence)})</li>`,
    )
    .join("")}</ul>
</details>
</section>

<section id="human-review">
<h2>8. Human Review Items</h2>
${humanReview.map(findingCard).join("") || "<p>なし</p>"}
</section>

<section id="evidence">
<h2>9. Evidence</h2>
<ul>${attention.flatMap((f) => (f.evidence ?? []).map((e) => `<li>${esc(f.id)}: [${esc(e.type)}] ${esc(e.artifact)}${e.region ? ` region(x=${e.region.x}, y=${e.region.y}, w=${e.region.width}, h=${e.region.height})` : ""}</li>`)).join("") || "<li>なし</li>"}</ul>
</section>

<section id="reproduction">
<h2>10. Reproduction Information</h2>
<table>
<tr><th>scenario</th><td>${esc(data.capture.scenario)}</td></tr>
${Object.entries(data.capture.environment ?? {})
  .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
  .join("")}
${data.capture.source ? `<tr><th>capture tool</th><td>${esc(data.capture.source.tool)} ${esc(data.capture.source.tool_version ?? "")}</td></tr>` : ""}
<tr><th>harness</th><td>${esc(data.versions.harness)}</td></tr>
${data.versions.philosophy_pack ? `<tr><th>philosophy pack</th><td>${esc(data.versions.philosophy_pack)}</td></tr>` : ""}
</table>
</section>

<section id="artifacts">
<h2>11. Artifact Links</h2>
<table><tr><th>path</th><th>sha256</th></tr>
${data.capture.artifacts.map((a) => `<tr><td>${esc(a.path)}</td><td><code>${esc(a.sha256.slice(0, 16))}…</code></td></tr>`).join("")}
</table>
</section>

</body>
</html>
`;
}
