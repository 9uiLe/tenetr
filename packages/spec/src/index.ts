import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_IDS = [
  "philosophy-pack",
  "design-intent",
  "evaluation",
  "run-manifest",
] as const;

export type SchemaId = (typeof SCHEMA_IDS)[number];

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function schemaPath(id: SchemaId): string {
  return join(packageRoot, "schemas", `${id}.schema.json`);
}

export function loadSchema(id: SchemaId): Record<string, unknown> {
  return JSON.parse(readFileSync(schemaPath(id), "utf8")) as Record<
    string,
    unknown
  >;
}

export type PackDocumentKind =
  | "packManifest"
  | "principlesDocument"
  | "exemplarsDocument"
  | "expectedJudgmentsDocument"
  | "tradeoffsDocument"
  | "antiPatternsDocument"
  | "scenariosDocument";

export function packDocumentRef(kind: PackDocumentKind): string {
  return `https://github.com/9uiLe/tenetr/schemas/philosophy-pack.schema.json#/$defs/${kind}`;
}

export type {
  DesignIntentContract,
  EvaluationResult,
  PhilosophyPack,
  RunManifest,
} from "./generated/index.js";
