---
name: design-philosophy-compliance
description: プロダクト固有のデザイン哲学 (Philosophy Pack) に準拠して UI 変更を実装・評価する。UI 画面の変更、デザイン改善タスク、design-harness の実行時に使う。
---

# Design Philosophy Compliance (Claude Code adapter)

正典は `skills/agent-skills/design-philosophy-compliance/SKILL.md`。まずそれを読み、Required steps と Prohibited behavior に厳密に従うこと。このアダプターは Claude Code のスキル探索へ正典を接続するだけで、手順を複製しない。

- CLI 実行: `skills/agent-skills/design-philosophy-compliance/scripts/design-harness.sh <command> ...`(外部リポジトリでは PATH の `design-harness`)
- 最終報告: `skills/agent-skills/design-philosophy-compliance/references/report-format.md` の形式
