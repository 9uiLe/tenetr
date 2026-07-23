import { MODEL_RESPONSE_SCHEMA } from "./response-schema.js";
import type { ModelEvaluationRequest, ModelImage } from "./transport.js";

export interface PackModelData {
  principles: {
    id: string;
    title: string;
    statement: string;
    rationale: string;
    observable_signals: string[];
    checks: { model: string[] };
    exemplars?: { supports?: string[]; violates?: string[] };
  }[];
  exemplars: {
    id: string;
    status: "accepted" | "rejected";
    artifact: string;
    rationale: string;
  }[];
}

export interface BuilderArtifacts {
  afterImage: { path: string; sha256: string };
  beforeImage?: { path: string; sha256: string };
  exemplarImage: (
    exemplarId: string,
  ) => { path: string; sha256: string } | undefined;
}

export interface BuilderIntent {
  task: { description: string; scenario: string };
  constraints?: string[];
  applicablePrincipleIds: string[];
}

// Why not: 全原則を1リクエストに束ねる方が呼び出し数は減る | Reason: 原則ごとの独立リクエストは
// 判定の独立性を保ち、§19.4 の原則単位の一致率測定と 1:1 に対応する。共有プロンプトによる
// 判定間の相互汚染も避けられる
export function buildModelRequests(
  pack: PackModelData,
  intent: BuilderIntent,
  artifacts: BuilderArtifacts,
): ModelEvaluationRequest[] {
  const requests: ModelEvaluationRequest[] = [];
  for (const principle of pack.principles) {
    if (!intent.applicablePrincipleIds.includes(principle.id)) continue;
    if (principle.checks.model.length === 0) continue;

    const relevantIds = new Set([
      ...(principle.exemplars?.supports ?? []),
      ...(principle.exemplars?.violates ?? []),
    ]);
    const images: ModelImage[] = [
      { id: "after", purpose: "after", ...artifacts.afterImage },
    ];
    if (artifacts.beforeImage) {
      images.push({
        id: "before",
        purpose: "before",
        ...artifacts.beforeImage,
      });
    }
    const exemplars: ModelEvaluationRequest["exemplars"] = [];
    for (const exemplar of pack.exemplars) {
      if (!relevantIds.has(exemplar.id)) continue;
      const image = artifacts.exemplarImage(exemplar.id);
      if (!image) continue;
      // Why not: 同一画像でも事例として送る方が入力は揃う | Reason: 評価対象と同一ハッシュの
      // exemplar は正解ラベルの漏洩になる (#20 の測定を無効化する。ADR-0006 Q1)
      if (image.sha256 === artifacts.afterImage.sha256) continue;
      const imageId = `exemplar-${exemplar.id}`;
      images.push({
        id: imageId,
        purpose:
          exemplar.status === "accepted"
            ? "exemplar-accepted"
            : "exemplar-rejected",
        ...image,
      });
      exemplars.push({
        id: exemplar.id,
        status: exemplar.status,
        rationale: exemplar.rationale,
        imageId,
      });
    }

    requests.push({
      principle: {
        id: principle.id,
        title: principle.title,
        statement: principle.statement,
        rationale: principle.rationale,
        observable_signals: principle.observable_signals,
        model_checks: principle.checks.model,
      },
      task: intent.task,
      constraints: intent.constraints ?? [],
      exemplars,
      images,
      responseSchema: MODEL_RESPONSE_SCHEMA,
    });
  }
  return requests;
}

export interface AntiPatternData {
  id: string;
  description: string;
  examples?: string[];
  detection: { model: boolean };
}

// §12.3「却下例と同じ失敗を再発していないか」の比較リクエスト。principle と同じ
// リクエスト形に写像し、finding の principle フィールドに anti-pattern id を載せる。
export function buildAntiPatternRequests(
  antiPatterns: AntiPatternData[],
  exemplars: PackModelData["exemplars"],
  intent: BuilderIntent,
  artifacts: BuilderArtifacts,
): ModelEvaluationRequest[] {
  const requests: ModelEvaluationRequest[] = [];
  for (const antiPattern of antiPatterns) {
    if (!antiPattern.detection.model) continue;
    const exampleIds = new Set(antiPattern.examples ?? []);
    const images: ModelImage[] = [
      { id: "after", purpose: "after", ...artifacts.afterImage },
    ];
    const requestExemplars: ModelEvaluationRequest["exemplars"] = [];
    for (const exemplar of exemplars) {
      if (!exampleIds.has(exemplar.id)) continue;
      const image = artifacts.exemplarImage(exemplar.id);
      if (!image) continue;
      if (image.sha256 === artifacts.afterImage.sha256) continue;
      const imageId = `exemplar-${exemplar.id}`;
      images.push({ id: imageId, purpose: "exemplar-rejected", ...image });
      requestExemplars.push({
        id: exemplar.id,
        status: "rejected",
        rationale: exemplar.rationale,
        imageId,
      });
    }
    requests.push({
      principle: {
        id: antiPattern.id,
        title: `Anti-pattern: ${antiPattern.id}`,
        statement: antiPattern.description,
        rationale: "過去に却下された失敗パターンの再発を防ぐ。",
        observable_signals: [],
        model_checks: [
          "この anti-pattern と同じ失敗が after 画像に再発していないか、却下例と比較して判定する",
        ],
      },
      task: intent.task,
      constraints: intent.constraints ?? [],
      exemplars: requestExemplars,
      images,
      responseSchema: MODEL_RESPONSE_SCHEMA,
    });
  }
  return requests;
}
