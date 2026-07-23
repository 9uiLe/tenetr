# Phase 6 E2E 検証記録(Issue #26)

自然言語タスク → resolve → capture → evaluate(モデル評価含む)→ report → manifest の一気通貫を、Agent(Claude Code)が design-philosophy-compliance スキルの手順どおりに実行した記録。生成物一式は `e2e-run/` にコミット済み。

## 実行条件

- 実行日: 2026-07-24
- タスク: `examples/num-path/task.yaml`(ADR-0002 の改善タスク、自然言語)
- 対象画像: Issue #3 で実機基盤から取得した committed Before 画像(改善実装前の実画面)
- コマンド: `design-harness run --pack examples/num-path/design-philosophy --task examples/num-path/task.yaml --scenario completed --profiles <trusted profiles> --out <run dir> --model-transport claude-cli:sonnet --before examples/num-path/scenarios/completed/before.png`
- モデル評価: claude-cli transport(**探索用。ADR-0006 のとおり正式測定は SDK transport 導入後**)。全送信は egress チョークポイント経由(`e2e-run/egress-audit.json` に payload hash 付きで記録)

## 手順遵守の確認(§11.2)

- [x] validate → resolve → evaluate → report の順で実行(`run` が §10.7 の順序を強制)
- [x] blocking 未解決事項なし(intent.json: `ready_to_implement: true`)を確認してから評価実行
- [x] Deterministic fail: 0(gate PASS)。fail 放置なし
- [x] warn 1 件・human_review 2 件を隠さず本記録と report に記載
- [x] Pack の書き換えなし(governance CI が同一 PR で検証)

## 最終報告(§11.3 形式)

```text
実装内容
- 変更した画面: 日次パズル完了画面 (scenario: completed)
- 主な変更点: 本 E2E は改善実装前の Before 画面の評価まで。アプリ側の改善実装は
  Harness 運用フェーズの作業であり、本 Run はそのベースライン評価となる

適用したデザイン原則
- focus.single-primary-decision / information.minimal-first-view /
  expression.no-artificial-excitement / consistency.use-established-components /
  brand.expression-within-usability(resolve が事例参照から自動抽出)

評価結果
- Deterministic: Pass 1 / Fail 0 / Unknown 5(実画面の ui-snapshot 未提供による誠実な縮退。
  §12.2 のとおり画像からの推定はしない)
- Model-based: Pass 3 / Warn 1
  - warn: information.minimal-first-view (confidence 0.85)
    「初期表示にバッジ・リマインダー等の補助情報が並び判断材料が最小でない」
    → ADR-0002 の改善タスク仮説と一致
- Human Review: 2 件
  - focus.single-primary-decision (confidence 0.62 → 閾値 0.70 未満で昇格)
  - consistency.use-established-components (confidence 0.60 → 同上)

成果物
- e2e-run/report.html (before/after 画像・領域ハイライト・11 セクション)
- e2e-run/evaluation.json / e2e-run/run-manifest.json / e2e-run/egress-audit.json
```

## 観察された品質特性

- confidence 閾値による human_review 昇格(§12.4)が実データで作動した。
- モデル評価は gate に影響せず(§13.2)、warn と human_review としてレポートに現れた。
- 実画面の ui-snapshot が無い場合、決定的評価は unknown を返し推測しない(§12.2)。
  実運用ではアプリ側の capture プロファイルが ui-snapshot を供給する(Phase 2 の契約)。
