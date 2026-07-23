import { loadSchema } from "@tenetr/spec";
import { Ajv2020 } from "ajv/dist/2020.js";

export function validateEvaluationDocument(doc: unknown): {
  ok: boolean;
  errors?: string;
} {
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(loadSchema("evaluation"));
  if (validate(doc)) return { ok: true };
  return { ok: false, errors: JSON.stringify(validate.errors) };
}
