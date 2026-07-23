export const SCHEMA_IDS = [
  "philosophy-pack",
  "design-intent",
  "evaluation",
  "run-manifest",
] as const;

export type SchemaId = (typeof SCHEMA_IDS)[number];
