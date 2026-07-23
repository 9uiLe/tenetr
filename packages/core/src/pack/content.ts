import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface PackPrinciple {
  id: string;
  title: string;
  statement: string;
  rationale: string;
  observable_signals: string[];
  checks: { deterministic: { id: string; expect: string }[]; model: string[] };
  exemplars?: { supports?: string[]; violates?: string[] };
}

export interface PackExemplar {
  id: string;
  status: "accepted" | "rejected";
  artifact: string;
  artifactPath: string;
  rationale: string;
  scenario: string;
}

// 呼び出し前提: validatePack が ok を返した Pack。
export function loadPackContent(packDir: string): {
  principles: PackPrinciple[];
  exemplars: PackExemplar[];
} {
  const manifest = parse(readFileSync(join(packDir, "pack.yaml"), "utf8")) as {
    files: Record<string, string>;
  };
  const principlesDoc = parse(
    readFileSync(
      join(packDir, manifest.files.principles ?? "principles.yaml"),
      "utf8",
    ),
  ) as { principles: PackPrinciple[] };
  const exemplarsDoc = parse(
    readFileSync(
      join(packDir, manifest.files.exemplars ?? "exemplars/index.yaml"),
      "utf8",
    ),
  ) as { exemplars: Omit<PackExemplar, "artifactPath">[] };
  return {
    principles: principlesDoc.principles,
    exemplars: exemplarsDoc.exemplars.map((exemplar) => ({
      ...exemplar,
      artifactPath: join(packDir, "exemplars", exemplar.artifact),
    })),
  };
}
