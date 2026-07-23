import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface ScenarioDefinition {
  id: string;
  description: string;
  capture_profile: string;
  required_artifacts: string[];
  reproduction: { method: string; ready_signal?: string; notes?: string };
  required_element_identifiers?: string[];
  environment?: Record<string, string>;
}

// 呼び出し前提: validatePack が ok を返した Pack (schema/参照検証済みの型付き読み出し)
export function loadScenarios(packDir: string): ScenarioDefinition[] {
  const manifest = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")) as {
    files: Record<string, string>;
  };
  const rel = manifest.files.scenarios;
  if (typeof rel !== "string") return [];
  const doc = parse(readFileSync(join(packDir, rel), "utf8")) as {
    scenarios: ScenarioDefinition[];
  };
  return doc.scenarios;
}
