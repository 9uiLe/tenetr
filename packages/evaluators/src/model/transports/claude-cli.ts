import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ModelEvaluationRequest,
  PreparedImage,
  ProviderTransport,
} from "../transport.js";

export interface ClaudeCliOptions {
  model?: string;
  maxBudgetUsd?: number;
  timeoutSeconds?: number;
}

// 探索(provisional)測定用の transport (ADR-0006 Q3)。正式測定は SDK transport +
// conformance gate 通過後 (ADR-0001 拘束7)。送信画像は prepareEgress 済みのもののみ受け取る。
export function createClaudeCliTransport(
  options: ClaudeCliOptions = {},
): ProviderTransport {
  return {
    id: "claude-cli",
    send(request: ModelEvaluationRequest, preparedImages: PreparedImage[]) {
      const tmp = mkdtempSync(join(tmpdir(), "tenetr-model-egress-"));
      try {
        const imagePaths = new Map<string, string>();
        for (const image of preparedImages) {
          const path = join(tmp, `${image.id}.png`);
          writeFileSync(path, image.bytes);
          imagePaths.set(image.id, path);
        }
        const prompt = buildPrompt(request, imagePaths);
        const args = [
          "-p",
          "--output-format",
          "json",
          "--allowedTools",
          "Read",
          "--max-budget-usd",
          String(options.maxBudgetUsd ?? 2),
        ];
        if (options.model) args.push("--model", options.model);
        args.push(prompt);
        const spawned = spawnSync("claude", args, {
          encoding: "utf8",
          timeout: (options.timeoutSeconds ?? 300) * 1000,
        });
        if (spawned.error) throw spawned.error;
        if (spawned.status !== 0) {
          throw new Error(
            `claude cli exited ${spawned.status}: ${(spawned.stderr ?? "").slice(-300)}`,
          );
        }
        const envelope = JSON.parse(spawned.stdout) as { result?: string };
        return Promise.resolve(extractJson(envelope.result ?? ""));
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
  };
}

function buildPrompt(
  request: ModelEvaluationRequest,
  imagePaths: Map<string, string>,
): string {
  const lines: string[] = [];
  lines.push(
    "あなたはプロダクト固有のデザイン哲学に基づく視覚評価者です。以下の原則について、実装後画面を評価してください。",
  );
  lines.push("");
  lines.push(`## 原則: ${request.principle.id} — ${request.principle.title}`);
  lines.push(request.principle.statement);
  lines.push(`理由: ${request.principle.rationale}`);
  lines.push("観測可能な兆候:");
  for (const signal of request.principle.observable_signals) {
    lines.push(`- ${signal}`);
  }
  lines.push("評価観点:");
  for (const check of request.principle.model_checks) {
    lines.push(`- ${check}`);
  }
  lines.push("");
  lines.push(`## タスク: ${request.task.description}`);
  for (const constraint of request.constraints) {
    lines.push(`制約: ${constraint}`);
  }
  lines.push("");
  lines.push("## 画像 (Read ツールで全て確認すること)");
  for (const [id, path] of imagePaths) {
    const image = request.images.find((i) => i.id === id);
    lines.push(`- ${id} (${image?.purpose ?? "unknown"}): ${path}`);
  }
  for (const exemplar of request.exemplars) {
    lines.push(
      `事例 ${exemplar.id} (${exemplar.status === "accepted" ? "採用" : "却下"}): ${exemplar.rationale}`,
    );
  }
  lines.push("");
  lines.push(
    "全画像を確認後、次の JSON Schema に厳密に準拠した JSON のみを出力すること。説明文・コードフェンスは禁止。",
  );
  lines.push(JSON.stringify(request.responseSchema));
  lines.push(
    '判定は after 画像に対して行う。観測事実 (observations) と判断 (judgment) を分離し、確信が持てない場合は verdict "unknown"、人間の価値判断が必要な場合は "human_review" を選ぶこと。',
  );
  return lines.join("\n");
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(
      `model response contains no JSON object: ${text.slice(0, 120)}`,
    );
  }
  return JSON.parse(text.slice(start, end + 1));
}
