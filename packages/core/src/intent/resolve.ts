import { existsSync, readFileSync } from "node:fs";
import type { DesignIntentContract } from "@tenetr/spec";
import { loadSchema } from "@tenetr/spec";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";
import type { ValidationResult } from "../pack/validate.js";
import { validatePack } from "../pack/validate.js";

export interface TaskOpenQuestion {
  id: string;
  question: string;
  blocking: boolean;
  default_answer?: string;
}

export interface TaskDefinition {
  schema_version: string;
  id: string;
  description: string;
  scenario: string;
  screen?: string;
  keep?: string[];
  open_questions?: TaskOpenQuestion[];
}

export type ResolveFailure =
  | { kind: "pack-invalid"; validation: ValidationResult }
  | { kind: "task-environment"; message: string }
  | { kind: "task-invalid"; message: string }
  | { kind: "intent-schema"; message: string };

export type ResolveOutcome =
  | { ok: true; intent: DesignIntentContract }
  | { ok: false; failure: ResolveFailure };

interface PackData {
  principles: {
    principles: {
      id: string;
      title: string;
      checks: { deterministic: { id: string; expect: string }[] };
    }[];
  };
  exemplars: {
    exemplars: {
      id: string;
      status: "accepted" | "rejected";
      scenario: string;
      principles: { supports?: string[]; violates?: string[] };
    }[];
  };
}

export function resolveIntent(
  packDir: string,
  taskFile: string,
): ResolveOutcome {
  const validation = validatePack(packDir);
  if (!validation.ok) {
    return { ok: false, failure: { kind: "pack-invalid", validation } };
  }

  if (!existsSync(taskFile)) {
    return {
      ok: false,
      failure: {
        kind: "task-environment",
        message: `task file does not exist: ${taskFile}`,
      },
    };
  }

  let task: TaskDefinition;
  try {
    task = parse(readFileSync(taskFile, "utf8")) as TaskDefinition;
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "task-environment",
        message: `task YAML parse error: ${(error as Error).message}`,
      },
    };
  }

  const taskError = validateTaskShape(task);
  if (taskError) {
    return { ok: false, failure: { kind: "task-invalid", message: taskError } };
  }

  const pack = loadPackData(packDir);
  const intent = buildIntent(task, pack);

  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(loadSchema("design-intent"));
  if (!validate(intent)) {
    return {
      ok: false,
      failure: {
        kind: "intent-schema",
        message: `generated intent violates design-intent schema: ${JSON.stringify(validate.errors)}`,
      },
    };
  }

  return { ok: true, intent };
}

function validateTaskShape(
  task: TaskDefinition | null | undefined,
): string | undefined {
  if (typeof task !== "object" || task === null)
    return "task file is not a mapping";
  if (typeof task.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(task.id)) {
    return "task.id must be a kebab-case string";
  }
  if (typeof task.description !== "string" || task.description.length === 0) {
    return "task.description is required";
  }
  if (typeof task.scenario !== "string" || task.scenario.length === 0) {
    return "task.scenario is required";
  }
  for (const question of task.open_questions ?? []) {
    if (
      typeof question.id !== "string" ||
      typeof question.question !== "string"
    ) {
      return "open_questions entries need id and question";
    }
    if (typeof question.blocking !== "boolean") {
      return `open_questions.${question.id}.blocking must be boolean`;
    }
  }
  return undefined;
}

function loadPackData(packDir: string): PackData {
  // Why not: validatePack と別に再読込せず結果を受け渡すことも出来る | Reason: validate は raw unknown を扱い、
  // ここでは検証済み前提の型付きアクセスが欲しい。読み込みは安価で、境界を単純に保つ方を優先する
  const manifest = parse(readFileSync(`${packDir}/pack.yaml`, "utf8")) as {
    files: Record<string, string>;
  };
  return {
    principles: parse(
      readFileSync(`${packDir}/${manifest.files.principles}`, "utf8"),
    ) as PackData["principles"],
    exemplars: parse(
      readFileSync(`${packDir}/${manifest.files.exemplars}`, "utf8"),
    ) as PackData["exemplars"],
  };
}

function buildIntent(
  task: TaskDefinition,
  pack: PackData,
): DesignIntentContract {
  const scenarioExemplars = pack.exemplars.exemplars.filter(
    (exemplar) => exemplar.scenario === task.scenario,
  );

  const applicableIds = new Set<string>();
  for (const exemplar of scenarioExemplars) {
    for (const id of exemplar.principles.supports ?? []) applicableIds.add(id);
    for (const id of exemplar.principles.violates ?? []) applicableIds.add(id);
  }

  const applicablePrinciples = pack.principles.principles
    .filter((principle) => applicableIds.has(principle.id))
    .map((principle) => ({
      id: principle.id,
      reason: reasonForPrinciple(principle.id, scenarioExemplars),
    }));

  const referencedExemplars = scenarioExemplars.map((exemplar) => ({
    id: exemplar.id,
    relation: (exemplar.status === "accepted" ? "follow" : "avoid") as
      | "follow"
      | "avoid",
  }));

  const unresolved = (task.open_questions ?? []).map((question) => ({
    id: question.id,
    question: question.question,
    blocking: question.blocking,
    ...(question.default_answer !== undefined
      ? { default_answer: question.default_answer }
      : {}),
  }));

  const acceptanceCriteria = pack.principles.principles
    .filter((principle) => applicableIds.has(principle.id))
    .flatMap((principle) =>
      principle.checks.deterministic.map(
        (check) => `${check.id} ${check.expect}`,
      ),
    );

  const blockers: string[] = [];
  if (scenarioExemplars.length === 0) {
    blockers.push(
      `no exemplar is recorded for scenario: ${task.scenario} (対象画面が特定されていない)`,
    );
  }
  if (applicablePrinciples.length === 0) {
    blockers.push("no applicable principle (適用原則が1つもない)");
  }
  for (const question of unresolved) {
    if (question.blocking) {
      blockers.push(`blocking unresolved item: ${question.id}`);
    }
  }
  if (acceptanceCriteria.length === 0) {
    blockers.push("no acceptance criterion (受け入れ条件が1つもない)");
  }

  return {
    schema_version: "1.0",
    task: {
      id: task.id,
      description: task.description,
      scenario: task.scenario,
      ...(task.screen !== undefined ? { screen: task.screen } : {}),
    },
    classification:
      scenarioExemplars.length > 0 ? "improve-existing-screen" : "unknown",
    applicable_principles: applicablePrinciples,
    referenced_exemplars: referencedExemplars,
    tradeoff_resolutions: [],
    unresolved_items: unresolved,
    acceptance_criteria: acceptanceCriteria,
    ...(task.keep !== undefined ? { constraints: task.keep } : {}),
    ready_to_implement: blockers.length === 0,
    ready_blockers: blockers,
  };
}

function reasonForPrinciple(
  principleId: string,
  scenarioExemplars: PackData["exemplars"]["exemplars"],
): string {
  const supporting = scenarioExemplars
    .filter((e) => (e.principles.supports ?? []).includes(principleId))
    .map((e) => e.id);
  const violating = scenarioExemplars
    .filter((e) => (e.principles.violates ?? []).includes(principleId))
    .map((e) => e.id);
  const parts: string[] = [];
  if (supporting.length > 0)
    parts.push(`採用例 ${supporting.join(", ")} が支持`);
  if (violating.length > 0)
    parts.push(`却下例 ${violating.join(", ")} が違反として記録`);
  return `対象シナリオの事例が本原則を参照している (${parts.join("、")})`;
}
