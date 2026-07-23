#!/usr/bin/env node
// Issue #20 の一致率測定 (ADR-0006 Q3)。claude-cli transport による探索測定 (PROVISIONAL)。
// 正式測定は SDK transport + conformance gate 通過後に同一手順で再実行する。
// 使い方: node scripts/measure-model-agreement.mjs [--runs 3] [--concurrency 6] [--model sonnet] [--out <dir>]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const requireFromCore = createRequire(new URL("../packages/core/package.json", import.meta.url));
const { parse } = await import(requireFromCore.resolve("yaml"));
import { loadPackContent } from "../packages/core/dist/index.js";
import {
  buildModelRequests,
  createClaudeCliTransport,
  runModelEvaluation,
} from "../packages/evaluators/dist/index.js";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const RUNS = Number(arg("runs", "3"));
const CONCURRENCY = Number(arg("concurrency", "6"));
const MODEL = arg("model", "sonnet");
const OUT_DIR = arg("out", "docs/phase4");
const LIMIT = Number(arg("limit", "0"));

const packDir = "examples/num-path/design-philosophy";
const content = loadPackContent(packDir);
const judgments = parse(readFileSync(join(packDir, "expected-judgments.yaml"), "utf8"));

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const exemplarImage = (id) => {
  const exemplar = content.exemplars.find((e) => e.id === id);
  if (!exemplar) return undefined;
  return { path: exemplar.artifactPath, sha256: sha256(exemplar.artifactPath) };
};

const transport = createClaudeCliTransport({ model: MODEL, maxBudgetUsd: 1 });
const jobs = [];
const casesToMeasure = LIMIT > 0 ? judgments.cases.slice(0, LIMIT) : judgments.cases;
for (const judgmentCase of casesToMeasure) {
  const after = exemplarImage(judgmentCase.exemplar);
  if (!after) continue;
  for (let run = 1; run <= RUNS; run++) {
    jobs.push({ judgmentCase, after, run });
  }
}

console.log(`measuring ${casesToMeasure.length} cases x ${RUNS} runs = ${jobs.length} calls (model: ${MODEL})`);

const results = [];
let completed = 0;
const worker = async () => {
  for (;;) {
    const job = jobs.shift();
    if (!job) return;
    const { judgmentCase, after, run } = job;
    const requests = buildModelRequests(
      { principles: content.principles, exemplars: content.exemplars },
      {
        task: {
          description:
            "日次完了画面の初期表示を必要最小限にし、次の行動が迷わず1つに定まるようにする。完了の事実と連続記録は残す。",
          scenario: "completed",
        },
        constraints: ["完了の事実(ヘッダー)を残す", "連続記録の表示を残す"],
        applicablePrincipleIds: [judgmentCase.principle],
      },
      { afterImage: after, exemplarImage },
    );
    if (requests.length === 0) {
      results.push({
        exemplar: judgmentCase.exemplar,
        principle: judgmentCase.principle,
        run,
        expected: judgmentCase.expected_verdict,
        got: "no-model-check",
        confidence: null,
      });
      completed += 1;
      continue;
    }
    const findings = await runModelEvaluation(requests, transport, {
      confidenceThreshold: 0,
      egressPolicy: {
        policy_version: "1.0",
        allowed_purposes: ["after", "exemplar-accepted", "exemplar-rejected"],
        mask_regions: [],
      },
    });
    const finding = findings[0];
    results.push({
      exemplar: judgmentCase.exemplar,
      principle: judgmentCase.principle,
      run,
      expected: judgmentCase.expected_verdict,
      case_class: judgmentCase.case_class,
      got: finding?.verdict ?? "missing",
      confidence: finding?.confidence ?? null,
    });
    completed += 1;
    console.log(
      `[${completed}] ${judgmentCase.exemplar} x ${judgmentCase.principle} run${run}: expected=${judgmentCase.expected_verdict} got=${finding?.verdict} conf=${finding?.confidence}`,
    );
  }
};

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "model-agreement-raw.json"), `${JSON.stringify({ model: MODEL, runs: RUNS, results }, null, 2)}\n`);

// 集計
const measured = results.filter((r) => r.got !== "no-model-check" && r.got !== "missing");
const attention = new Set(["warn", "fail", "unknown", "human_review"]);
const isAttention = (v) => attention.has(v);
const abstain = new Set(["unknown", "human_review"]);

let exact = 0;
let binaryMatch = 0;
let abstained = 0;
const confusion = {};
let expectedFailTotal = 0;
let failMissed = 0;
let expectedPassTotal = 0;
let falseAlarm = 0;
for (const r of measured) {
  const key = `${r.expected}->${r.got}`;
  confusion[key] = (confusion[key] ?? 0) + 1;
  if (abstain.has(r.got)) abstained += 1;
  if (r.expected === r.got) exact += 1;
  if (isAttention(r.expected) === isAttention(r.got)) binaryMatch += 1;
  if (r.expected === "fail" || r.expected === "warn") {
    expectedFailTotal += 1;
    if (r.got === "pass") failMissed += 1;
  }
  if (r.expected === "pass") {
    expectedPassTotal += 1;
    if (r.got === "warn" || r.got === "fail") falseAlarm += 1;
  }
}

// 判定の揺れ: ケースごとに RUNS 回の verdict が全一致か
const byCase = new Map();
for (const r of measured) {
  const key = `${r.exemplar}|${r.principle}`;
  if (!byCase.has(key)) byCase.set(key, []);
  byCase.get(key).push(r.got);
}
let unstable = 0;
for (const verdicts of byCase.values()) {
  if (new Set(verdicts).size > 1) unstable += 1;
}

const pct = (n, d) => (d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}% (${n}/${d})`);
const summary = {
  model: MODEL,
  runs: RUNS,
  measured_calls: measured.length,
  cases_with_model_check: byCase.size,
  exact_match: pct(exact, measured.length),
  binary_match_pass_vs_attention: pct(binaryMatch, measured.length),
  fail_or_warn_missed_as_pass: pct(failMissed, expectedFailTotal),
  false_alarm_on_expected_pass: pct(falseAlarm, expectedPassTotal),
  abstention_rate: pct(abstained, measured.length),
  unstable_cases_across_runs: pct(unstable, byCase.size),
  confusion,
};
writeFileSync(join(OUT_DIR, "model-agreement-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
