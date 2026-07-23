import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { default as addFormatsModule } from "ajv-formats";

const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void;

import type { RunManifest } from "@tenetr/spec";
import { loadSchema } from "@tenetr/spec";

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Pack 全ファイルの決定的ハッシュ: 相対パス順に path と内容を連結して単一 sha256 にする。
export function packSha256(packDir: string): string {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else files.push(abs);
    }
  };
  walk(packDir);
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(relative(packDir, file));
    digest.update("\0");
    digest.update(readFileSync(file));
    digest.update("\0");
  }
  return digest.digest("hex");
}

export interface GitContext {
  repository: string;
  commit: string;
  dirty: boolean;
}

export function gitContext(cwd: string): GitContext {
  const git = (args: string[]): string => {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    } catch {
      return "";
    }
  };
  const remote = git(["remote", "get-url", "origin"]);
  const commit = git(["rev-parse", "HEAD"]);
  const status = git(["status", "--porcelain"]);
  return {
    repository: remote || "unknown",
    commit: commit || "0000000",
    dirty: status.length > 0,
  };
}

export function validateRunManifest(doc: unknown): {
  ok: boolean;
  errors?: string;
} {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(loadSchema("run-manifest"));
  if (validate(doc)) return { ok: true };
  return { ok: false, errors: JSON.stringify(validate.errors) };
}

export type { RunManifest };
