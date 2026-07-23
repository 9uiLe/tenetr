export type ModelImagePurpose =
  | "after"
  | "before"
  | "exemplar-accepted"
  | "exemplar-rejected";

export interface ModelImage {
  id: string;
  purpose: ModelImagePurpose;
  path: string;
  sha256: string;
}

export interface ModelEvaluationRequest {
  principle: {
    id: string;
    title: string;
    statement: string;
    rationale: string;
    observable_signals: string[];
    model_checks: string[];
  };
  task: {
    description: string;
    scenario: string;
  };
  constraints: string[];
  exemplars: {
    id: string;
    status: "accepted" | "rejected";
    rationale: string;
    imageId: string;
  }[];
  images: ModelImage[];
  responseSchema: Record<string, unknown>;
}

export interface ModelResponse {
  verdict: "pass" | "warn" | "unknown" | "human_review";
  confidence: number;
  observations: { type: "visual"; fact: string }[];
  judgment: string;
  remediation?: string;
  evidence_regions?: { x: number; y: number; width: number; height: number }[];
}

// モデル呼び出しの唯一の境界 (ADR-0001 拘束7 / ADR-0005 Q3)。
// SDK・HTTP クライアントの import はこの interface の実装モジュールにのみ許される。
export interface ProviderTransport {
  id: string;
  send(request: ModelEvaluationRequest): Promise<unknown>;
}
