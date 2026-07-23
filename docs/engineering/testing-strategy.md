# テスト戦略(§19 対応)

3 層を Vitest の projects で分離する。`pnpm check` が毎コミットの正規入口(build → lint → codegen 鮮度 → 全テスト)。

| 層 | 置き場所 | 対象 | 実行 |
| --- | --- | --- | --- |
| Unit | `packages/*/test/unit/` | 関数・モジュール単体の What | `pnpm test:unit` |
| Contract | `packages/*/test/contract/` | 外部契約: スキーマ検証、CLI の入出力・exit code、JSON 出力構造 | `pnpm test:contract` |
| Golden | `packages/*/test/golden/` | 固定入力に対する出力の構造固定(§19.3) | `pnpm test:golden` |

## 原則

- テスト名は「条件 + observable result」で書く(AGENTS.md Intent Placement)。
- Contract のうち CLI プロセス起動を伴うものは `dist/` を実行する。事前に `pnpm build` が必要(`pnpm check` は常にこの順で走る)。
- Golden はモデル自由文を対象にしない。JSON 構造・原則 ID・証拠の有無・判定カテゴリのみを固定する(§19.3)。
- 決定性: 同一入力で同一結果にならないテストは書かない。時刻・乱数・環境依存値は注入する。

## Golden fixture の管理

- fixture は各テストディレクトリの `__fixtures__/` に置き、テストと同じ PR で更新する。
- 更新手順: (1) 実装変更で Golden が落ちる → (2) 差分が意図どおりか確認 → (3) fixture を新出力で更新し、コミットの `Why:` に「何が変わったから Golden を更新したか」を書く。**テストを先に直して fixture を後追いさせない**(fixture 更新だけのコミットを禁止)。
- 機械的な再生成手段があるものはテストファイル冒頭コメントに再生成コマンドを明記する。

## CLI Contract テストの雛形

`packages/cli/test/contract/bin-execution.test.ts` が雛形。ビルド済み `dist/bin.js` を子プロセスで起動し、exit code / stdout / stderr を検証する。#7 以降、exit code 0-4 の契約マトリクス(全コマンド × 全異常系)をこの形式で拡張する。
