import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExitCode } from "../exit-codes.js";
import { EXIT_CODES } from "../exit-codes.js";
import type { CliIo } from "../io.js";

const PACK_YAML = `schema_version: "1.0"

product:
  id: my-product
  name: My Product
  philosophy_version: "0.1.0"

files:
  principles: principles.yaml
  exemplars: exemplars/index.yaml
  expected_judgments: expected-judgments.yaml

locale: ja-JP
`;

const PRINCIPLES_YAML = `schema_version: "1.0"

principles:
  - id: focus.single-primary-decision
    title: 主判断を1つに限定する
    statement: 各画面はユーザーに求める主判断を1つだけ提示する。
    rationale: 主操作が複数あると次に進む判断が遅れ、離脱と誤操作が増える。
    severity: fail
    observable_signals:
      - 主操作スタイル(filled/primary)のコントロールが画面に1つだけ存在する
    checks:
      deterministic:
        - id: primary-control-count
          expect: "== 1"
      model:
        - 主操作が一意に認識できるか
    exemplars:
      supports: [starter-good]
`;

const EXEMPLARS_YAML = `schema_version: "1.0"

exemplars:
  - id: starter-good
    status: accepted
    synthetic: true
    artifact: accepted/starter-good.png
    scenario: replace-me
    principles:
      supports: [focus.single-primary-decision]
    rationale: 主操作が1つだけ存在する初期テンプレート。実プロダクトの事例に差し替えること。
`;

const JUDGMENTS_YAML = `schema_version: "1.0"

cases:
  - exemplar: starter-good
    principle: focus.single-primary-decision
    expected_verdict: pass
    case_class: clear-pass
    rationale: 主操作が1つ。実プロダクトのラベルに差し替えること。
`;

// 1x1 transparent PNG。placeholder artifact を実在させ、生成直後の validate を通す。
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export function runInit(targetDir: string, io: CliIo): ExitCode {
  const packDir = join(targetDir, "design-philosophy");
  if (existsSync(packDir)) {
    io.err(`refusing to overwrite existing directory: ${packDir}`);
    return EXIT_CODES.environmentError;
  }

  mkdirSync(join(packDir, "exemplars", "accepted"), { recursive: true });
  mkdirSync(join(packDir, "exemplars", "rejected"), { recursive: true });
  mkdirSync(join(packDir, "decisions"), { recursive: true });
  mkdirSync(join(packDir, "scenarios"), { recursive: true });
  writeFileSync(join(packDir, "pack.yaml"), PACK_YAML);
  writeFileSync(join(packDir, "principles.yaml"), PRINCIPLES_YAML);
  writeFileSync(join(packDir, "exemplars", "index.yaml"), EXEMPLARS_YAML);
  writeFileSync(join(packDir, "expected-judgments.yaml"), JUDGMENTS_YAML);
  writeFileSync(
    join(packDir, "exemplars", "accepted", "starter-good.png"),
    PLACEHOLDER_PNG,
  );

  io.out(`initialized philosophy pack scaffold: ${packDir}`);
  io.out(
    "next: replace starter principle/exemplar/judgment with product content, then run validate",
  );
  return EXIT_CODES.valid;
}
