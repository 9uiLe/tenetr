# 0004: lint / format は Biome を採用する

- Date: 2026-07-23
- Status: accepted
- Issue: #4

## Context

ADR-0001 は lint/format をスコープ外とし Phase 1 での決定を求めた。O2(`pnpm check` の決定的再現)には、設定分岐が少なく出力が安定した単一ツールが望ましい。

## Decision

Biome(2.5.5 に pin)で lint + format を行う。`pnpm lint` = `biome check .`。

## Alternatives & dissent

- ESLint + Prettier: 普及度最大だが 2 ツール構成で設定・依存が増え、ルール解決の非決定要因(プラグイン更新)も増える。本リポジトリは新規で既存 ESLint 資産がなく、乗り換え価値がない。
- 低リスク・可逆な選定のため decision-council は実施せず、chair 単独決定として記録する(workflow §6 の「軽微」区分)。

## Consequences

- Intent Placement のコメント規約(Why not 形式)の機械検査は Biome の対象外。必要になったら別途スクリプト化する(Phase 7 の governance で再訪)。
- 既知事象: メモリ圧の高いローカル環境で Biome の linter サブプロセスが `terminated abnormally` 警告を出し、`--write` が適用されないことがある(exit code の error 検出は機能する)。その場合はディレクトリを絞った `biome format --write <dir>` で適用する。CI(クリーン環境)を最終防衛線とする。
