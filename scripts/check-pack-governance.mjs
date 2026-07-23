#!/usr/bin/env node
// §20.2-20.3 / Issue #28: Philosophy Pack の変更に Decision Record を強制する governance 検査。
// CI から: node scripts/check-pack-governance.mjs --base origin/master
// テストから: node scripts/check-pack-governance.mjs --changed <file...> [--pack-yaml-diff <file>]
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const readFlag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : undefined;
};

let changed;
const base = readFlag("base");
if (base) {
  const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    encoding: "utf8",
  });
  changed = out.split("\n").filter(Boolean);
} else {
  const i = args.indexOf("--changed");
  changed = i > -1 ? args.slice(i + 1).filter((a) => !a.startsWith("--")) : [];
}

const isPackFile = (f) => /(^|\/)design-philosophy\//.test(f);
const isGovernedPackFile = (f) =>
  isPackFile(f) && /(principles|anti-patterns|rubrics|expected-judgments)\.(ya?ml)$/.test(f);
const packChanges = changed.filter(isPackFile);
const governedChanges = changed.filter(isGovernedPackFile);
const adrChanges = changed.filter((f) => /^docs\/adr\/\d{4}-.+\.md$/.test(f));
const packManifestChanged = changed.some((f) => isPackFile(f) && f.endsWith("pack.yaml"));

const problems = [];
if (packChanges.length > 0 && adrChanges.length === 0) {
  problems.push(
    `Philosophy Pack の変更 (${packChanges.join(", ")}) には docs/adr/ の Decision Record 追加/更新が必要です (§20.2)`,
  );
}
if (governedChanges.length > 0 && !packManifestChanged) {
  problems.push(
    `原則・anti-pattern・rubric・期待判定の変更には pack.yaml の philosophy_version 更新が必要です (§22.3)`,
  );
}

if (problems.length > 0) {
  for (const p of problems) console.error(`governance: ${p}`);
  process.exit(1);
}
console.log(
  packChanges.length > 0
    ? `governance OK: pack changes accompanied by ADR (${adrChanges.join(", ")})`
    : "governance OK: no pack changes",
);
