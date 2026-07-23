---
name: design-philosophy-compliance
description: プロダクト固有のデザイン哲学 (Philosophy Pack) に準拠して UI 変更を実装・評価する。UI 画面の変更、デザイン改善タスク、design-harness の実行時に使う。
---

# Design Philosophy Compliance

## Goal

対象プロダクトのデザイン哲学 (Philosophy Pack) に準拠して UI 変更を実装し、証拠付きで評価する。一般的な「それっぽい」UI で埋めない。

## Required steps

1. ユーザーのタスクを読み、task.yaml (id / description / scenario / keep / open_questions) に落とす。
2. `design-harness validate --pack <design-philosophy dir>` を実行する。exit 0 以外なら Pack を修正するまで先へ進まない (1=スキーマ違反 / 2=参照切れ / 3=意味的矛盾 / 4=実行環境エラー)。
3. `design-harness resolve --pack <dir> --task <task.yaml> --out intent.json` を実行し、生成された Design Intent Contract を読む。
4. `ready_to_implement: false` の間は実装を開始しない。`ready_blockers` の blocking 未解決事項を人間に確認する。
5. Intent の acceptance_criteria / constraints の範囲内でのみ実装する。referenced_exemplars の follow は踏襲し avoid は再発させない。
6. 実装後、`design-harness capture --pack <dir> --scenario <id> --profiles <trusted profiles> --out artifacts/` で成果物を取得する。
7. `design-harness evaluate --pack <dir> --intent intent.json --artifacts artifacts/ --out evaluation.json` を実行する (モデル評価は `--model-transport` 指定時のみ)。
8. Deterministic の fail を修正して 6-7 を繰り返す。exit 1 (gate FAIL) のまま完了報告しない。
9. Warn と human_review を隠さない。判断を求める項目として報告に含める。
10. `design-harness report --evaluation evaluation.json --intent intent.json --artifacts artifacts/ --out report.html` で最終レポートを生成する (または `design-harness run` で一気通貫)。
11. 最終報告は references/report-format.md の形式に従う。

## Prohibited behavior

- 新しいデザイン原則を発明しない。
- 採用例・却下例を実装が通るように書き換えない (Pack の変更は Decision Record 必須)。
- Evaluator を削除・無効化しない。severity を明示的な Decision Record なしに下げない。
- warn を pass と説明しない。human_review を省略しない。
- 評価をスキップして「見た目で確認した」と報告しない。

## Scripts

- `scripts/design-harness.sh` — このリポジトリ内で CLI を実行する薄いラッパー (ビルド済み dist を解決)。外部リポジトリでは `design-harness` バイナリを PATH に置くこと。
