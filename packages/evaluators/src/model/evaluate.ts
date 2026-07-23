import { Ajv2020 } from "ajv/dist/2020.js";
import type { Finding } from "../context.js";
import { MODEL_RESPONSE_SCHEMA } from "./response-schema.js";
import type {
  ModelEvaluationRequest,
  ModelResponse,
  ProviderTransport,
} from "./transport.js";

export interface ModelRunOptions {
  confidenceThreshold: number;
}

export async function runModelEvaluation(
  requests: ModelEvaluationRequest[],
  transport: ProviderTransport,
  options: ModelRunOptions,
): Promise<Finding[]> {
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(MODEL_RESPONSE_SCHEMA);
  const findings: Finding[] = [];

  for (const request of requests) {
    const principleId = request.principle.id;
    const findingId = `finding-model-${principleId.replace(/\./g, "-")}`;
    let raw: unknown;
    try {
      raw = await transport.send(request);
    } catch (error) {
      findings.push({
        id: findingId,
        evaluator: `model-${transport.id}`,
        principle: principleId,
        kind: "model",
        verdict: "unknown",
        confidence: 0,
        observations: [
          {
            type: "environment",
            fact: `モデル呼び出しが失敗: ${(error as Error).message}`,
          },
        ],
        judgment: "モデル評価を実行できなかった",
      });
      continue;
    }

    if (!validate(raw)) {
      // Why not: 再試行やレスポンス修復も可能 | Reason: §12.4 のとおり判定不能は unknown として
      // 正直に返す。修復は「モデル自由文を信頼する」ことと同義で、schema 強制の意味を失う
      findings.push({
        id: findingId,
        evaluator: `model-${transport.id}`,
        principle: principleId,
        kind: "model",
        verdict: "unknown",
        confidence: 0,
        observations: [
          {
            type: "metadata",
            fact: `モデル出力が response schema に違反: ${JSON.stringify(validate.errors)?.slice(0, 300)}`,
          },
        ],
        judgment: "構造化出力の強制に失敗したため判定不能",
      });
      continue;
    }

    const response = raw as ModelResponse;
    const escalate =
      response.confidence < options.confidenceThreshold &&
      response.verdict !== "unknown";
    findings.push({
      id: findingId,
      evaluator: `model-${transport.id}`,
      principle: principleId,
      kind: "model",
      verdict: escalate ? "human_review" : response.verdict,
      confidence: response.confidence,
      observations: [
        ...response.observations,
        ...(escalate
          ? [
              {
                type: "metadata" as const,
                fact: `confidence ${response.confidence} が閾値 ${options.confidenceThreshold} 未満のため human_review へ昇格 (§12.4)`,
              },
            ]
          : []),
      ],
      judgment: response.judgment,
      ...(response.remediation !== undefined
        ? { remediation: response.remediation }
        : {}),
      ...(response.evidence_regions && response.evidence_regions.length > 0
        ? {
            evidence: response.evidence_regions.map((region) => ({
              type: "image_region" as const,
              artifact: "screenshot.png",
              region,
            })),
          }
        : {}),
    });
  }
  return findings;
}
