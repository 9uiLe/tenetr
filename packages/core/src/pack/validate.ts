import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackDocumentKind } from "@tenetr/spec";
import { loadSchema, packDocumentRef } from "@tenetr/spec";
import type { ValidateFunction } from "ajv/dist/2020.js";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";

export type ValidationStage =
  | "environment"
  | "schema"
  | "reference"
  | "semantic";

export interface ValidationIssue {
  stage: ValidationStage;
  file: string;
  path?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  failedStage?: ValidationStage;
  issues: ValidationIssue[];
}

interface LoadedPack {
  manifest: PackManifestShape;
  principles: PrinciplesShape;
  exemplars: ExemplarsShape;
  judgments: JudgmentsShape;
}

interface PackManifestShape {
  files: Record<string, string>;
}

interface PrincipleEntry {
  id: string;
  exemplars?: { supports?: string[]; violates?: string[] };
}

interface PrinciplesShape {
  principles: PrincipleEntry[];
}

interface ExemplarEntry {
  id: string;
  status: "accepted" | "rejected";
  artifact: string;
  principles: { supports?: string[]; violates?: string[] };
}

interface ExemplarsShape {
  exemplars: ExemplarEntry[];
}

interface JudgmentCaseEntry {
  exemplar: string;
  principle: string;
}

interface JudgmentsShape {
  cases: JudgmentCaseEntry[];
}

// Why not: 全 stage を常に実行して全 issue を返す設計も可能 | Reason: §10.2 の exit code は単一値であり、
// 先行 stage の失敗は後続 stage の入力を信頼できなくするため、stage 単位で短絡させて決定的な code を返す
const STAGE_ORDER: ValidationStage[] = [
  "environment",
  "schema",
  "reference",
  "semantic",
];

export function validatePack(packDir: string): ValidationResult {
  const collected: ValidationIssue[] = [];

  const environment = loadPackFiles(packDir, collected);
  if (collected.length > 0 || environment === undefined) {
    return { ok: false, failedStage: "environment", issues: collected };
  }

  validateSchemas(environment.raw, collected);
  if (collected.length > 0) {
    return { ok: false, failedStage: "schema", issues: collected };
  }

  const pack = environment.raw as unknown as LoadedPack;
  validateReferences(packDir, pack, collected);
  if (collected.length > 0) {
    return { ok: false, failedStage: "reference", issues: collected };
  }

  validateSemantics(pack, collected);
  if (collected.length > 0) {
    return { ok: false, failedStage: "semantic", issues: collected };
  }

  return { ok: true, issues: [] };
}

interface LoadedRaw {
  raw: {
    manifest: unknown;
    principles: unknown;
    exemplars: unknown;
    judgments: unknown;
  };
}

function loadPackFiles(
  packDir: string,
  issues: ValidationIssue[],
): LoadedRaw | undefined {
  if (!existsSync(packDir)) {
    issues.push({
      stage: "environment",
      file: packDir,
      message: "pack directory does not exist",
    });
    return undefined;
  }
  const manifestPath = join(packDir, "pack.yaml");
  if (!existsSync(manifestPath)) {
    issues.push({
      stage: "environment",
      file: manifestPath,
      message: "pack.yaml not found in pack directory",
    });
    return undefined;
  }

  const manifest = parseYamlFile(manifestPath, issues);
  if (manifest === undefined) return undefined;

  const files = (manifest as PackManifestShape).files;
  if (typeof files !== "object" || files === null) {
    // Why not: ここで schema stage に回すことも出来る | Reason: files が無いと後続ファイルを読めず
    // environment stage として扱う方が「実行環境エラー」の意味に合う
    return {
      raw: {
        manifest,
        principles: undefined,
        exemplars: undefined,
        judgments: undefined,
      },
    };
  }

  const read = (key: string): unknown => {
    const rel = files[key];
    if (typeof rel !== "string") return undefined;
    const abs = join(packDir, rel);
    if (!existsSync(abs)) {
      issues.push({
        stage: "environment",
        file: abs,
        message: `file referenced by pack.yaml files.${key} does not exist`,
      });
      return undefined;
    }
    return parseYamlFile(abs, issues);
  };

  const principles = read("principles");
  const exemplars = read("exemplars");
  const judgments = read("expected_judgments");
  return { raw: { manifest, principles, exemplars, judgments } };
}

function parseYamlFile(path: string, issues: ValidationIssue[]): unknown {
  try {
    return parse(readFileSync(path, "utf8"));
  } catch (error) {
    issues.push({
      stage: "environment",
      file: path,
      message: `YAML parse error: ${(error as Error).message}`,
    });
    return undefined;
  }
}

function validateSchemas(
  raw: LoadedRaw["raw"],
  issues: ValidationIssue[],
): void {
  const ajv = new Ajv2020({ allErrors: true });
  ajv.addSchema(loadSchema("philosophy-pack"));

  const check = (kind: PackDocumentKind, doc: unknown, file: string): void => {
    const validate = ajv.getSchema(packDocumentRef(kind)) as
      | ValidateFunction
      | undefined;
    if (!validate) throw new Error(`missing schema definition: ${kind}`);
    if (!validate(doc)) {
      for (const err of validate.errors ?? []) {
        issues.push({
          stage: "schema",
          file,
          path: err.instancePath || "/",
          message: `${err.message ?? "schema violation"}`,
        });
      }
    }
  };

  check("packManifest", raw.manifest, "pack.yaml");
  check("principlesDocument", raw.principles, "principles");
  check("exemplarsDocument", raw.exemplars, "exemplars");
  check("expectedJudgmentsDocument", raw.judgments, "expected_judgments");
}

function validateReferences(
  packDir: string,
  pack: LoadedPack,
  issues: ValidationIssue[],
): void {
  const principleIds = new Set(pack.principles.principles.map((p) => p.id));
  const exemplarIds = new Set(pack.exemplars.exemplars.map((e) => e.id));

  for (const principle of pack.principles.principles) {
    for (const rel of ["supports", "violates"] as const) {
      for (const ref of principle.exemplars?.[rel] ?? []) {
        if (!exemplarIds.has(ref)) {
          issues.push({
            stage: "reference",
            file: "principles",
            path: `${principle.id}.exemplars.${rel}`,
            message: `unknown exemplar id: ${ref}`,
          });
        }
      }
    }
  }

  for (const exemplar of pack.exemplars.exemplars) {
    for (const rel of ["supports", "violates"] as const) {
      for (const ref of exemplar.principles[rel] ?? []) {
        if (!principleIds.has(ref)) {
          issues.push({
            stage: "reference",
            file: "exemplars",
            path: `${exemplar.id}.principles.${rel}`,
            message: `unknown principle id: ${ref}`,
          });
        }
      }
    }
    const artifactPath = join(packDir, "exemplars", exemplar.artifact);
    if (!existsSync(artifactPath)) {
      issues.push({
        stage: "reference",
        file: "exemplars",
        path: `${exemplar.id}.artifact`,
        message: `artifact file does not exist: ${exemplar.artifact}`,
      });
    }
  }

  for (const [index, judgment] of pack.judgments.cases.entries()) {
    if (!exemplarIds.has(judgment.exemplar)) {
      issues.push({
        stage: "reference",
        file: "expected_judgments",
        path: `cases[${index}].exemplar`,
        message: `unknown exemplar id: ${judgment.exemplar}`,
      });
    }
    if (!principleIds.has(judgment.principle)) {
      issues.push({
        stage: "reference",
        file: "expected_judgments",
        path: `cases[${index}].principle`,
        message: `unknown principle id: ${judgment.principle}`,
      });
    }
  }
}

function validateSemantics(pack: LoadedPack, issues: ValidationIssue[]): void {
  const duplicate = (ids: string[], file: string): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        issues.push({
          stage: "semantic",
          file,
          path: id,
          message: `duplicate id: ${id}`,
        });
      }
      seen.add(id);
    }
  };
  duplicate(
    pack.principles.principles.map((p) => p.id),
    "principles",
  );
  duplicate(
    pack.exemplars.exemplars.map((e) => e.id),
    "exemplars",
  );

  for (const exemplar of pack.exemplars.exemplars) {
    const hasSupports = (exemplar.principles.supports ?? []).length > 0;
    const hasViolates = (exemplar.principles.violates ?? []).length > 0;
    if (exemplar.status === "accepted" && !hasSupports) {
      issues.push({
        stage: "semantic",
        file: "exemplars",
        path: exemplar.id,
        message: "accepted exemplar must support at least one principle",
      });
    }
    if (exemplar.status === "rejected" && !hasViolates) {
      issues.push({
        stage: "semantic",
        file: "exemplars",
        path: exemplar.id,
        message: "rejected exemplar must violate at least one principle",
      });
    }
  }

  const judgmentPairs = new Set(
    pack.judgments.cases.map((c) => `${c.exemplar} ${c.principle}`),
  );
  if (judgmentPairs.size !== pack.judgments.cases.length) {
    issues.push({
      stage: "semantic",
      file: "expected_judgments",
      message: "duplicate (exemplar, principle) judgment case",
    });
  }
  for (const exemplar of pack.exemplars.exemplars) {
    for (const principle of pack.principles.principles) {
      if (!judgmentPairs.has(`${exemplar.id} ${principle.id}`)) {
        issues.push({
          stage: "semantic",
          file: "expected_judgments",
          message: `missing judgment case for (${exemplar.id}, ${principle.id}) — all pairs must be labeled explicitly`,
        });
      }
    }
  }

  for (const principle of pack.principles.principles) {
    for (const rel of ["supports", "violates"] as const) {
      for (const ref of principle.exemplars?.[rel] ?? []) {
        const exemplar = pack.exemplars.exemplars.find((e) => e.id === ref);
        if (
          exemplar &&
          !(exemplar.principles[rel] ?? []).includes(principle.id)
        ) {
          issues.push({
            stage: "semantic",
            file: "principles",
            path: `${principle.id}.exemplars.${rel}`,
            message: `exemplar ${ref} does not declare ${rel} for this principle (bidirectional link broken)`,
          });
        }
      }
    }
  }
}

export function stageOrder(): readonly ValidationStage[] {
  return STAGE_ORDER;
}
