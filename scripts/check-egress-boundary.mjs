#!/usr/bin/env node
// ADR-0005 Q3 / ADR-0001 拘束7: 外部送信可能なクライアントの import を
// provider transport 実装ディレクトリの外で禁止する境界 lint。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ALLOWED_DIR = "packages/evaluators/src/model/transports";
const FORBIDDEN = [
  "@anthropic-ai/sdk",
  "openai",
  "undici",
  "node:http",
  "node:https",
  "node-fetch",
];

const violations = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(ROOT, abs);
    if (entry === "node_modules" || entry === "dist" || entry === "generated") continue;
    if (statSync(abs).isDirectory()) {
      walk(abs);
      continue;
    }
    if (!/\.(ts|mts|mjs|js)$/.test(entry)) continue;
    if (rel.startsWith(ALLOWED_DIR)) continue;
    if (rel.includes("/test/")) continue;
    const content = readFileSync(abs, "utf8");
    for (const name of FORBIDDEN) {
      const pattern = new RegExp(`(import|require)\\s*\\(?[^\\n]*["']${name}["']`);
      if (pattern.test(content)) {
        violations.push(`${rel}: forbidden network client "${name}" outside ${ALLOWED_DIR}`);
      }
    }
  }
};
walk(join(ROOT, "packages"));
if (violations.length > 0) {
  for (const v of violations) console.error(v);
  process.exit(1);
}
console.log("egress boundary clean");
