import type { UISnapshot } from "@tenetr/spec";

export interface CaptureManifestData {
  scenario: string;
  artifacts: { path: string; sha256: string }[];
}

export interface EvaluationContext {
  scenarioId: string;
  requiredArtifacts: string[];
  requiredElementIdentifiers: string[];
  captureManifest?: CaptureManifestData;
  uiSnapshot?: UISnapshot;
  screenshotArtifact: string;
}

export interface Finding {
  id: string;
  evaluator: string;
  principle?: string;
  check?: string;
  kind: "deterministic" | "model" | "human";
  verdict: "pass" | "warn" | "fail" | "unknown" | "human_review";
  confidence?: number;
  observations: {
    type: "visual" | "metadata" | "code" | "environment";
    fact: string;
  }[];
  judgment: string;
  remediation?: string;
  evidence?: {
    type: "image_region" | "artifact" | "metadata";
    artifact: string;
    region?: { x: number; y: number; width: number; height: number };
  }[];
}

export interface DeterministicEvaluator {
  id: string;
  evaluate(context: EvaluationContext): Finding[];
}

export interface FlatElement {
  id: string;
  role: string;
  label?: string;
  identifier?: string;
  frame: { x: number; y: number; width: number; height: number };
  enabled?: boolean;
  hittable?: boolean;
  traits?: string[];
}

export function flattenElements(snapshot: UISnapshot): FlatElement[] {
  const flat: FlatElement[] = [];
  const walk = (elements: UISnapshot["elements"]): void => {
    for (const element of elements) {
      flat.push(element as FlatElement);
      if (element.children) walk(element.children);
    }
  };
  walk(snapshot.elements);
  return flat;
}
