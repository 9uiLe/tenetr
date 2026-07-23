# Phase 3 受け入れ検証記録(Issue #15)

§21 Phase 3 の完了条件と、その独立検証の対応表。検証はすべて CI で恒久実行されるテストとして固定されている(一回きりの手動確認にしない)。

| 完了条件(§21 / §22.2) | 検証 | 場所 |
| --- | --- | --- |
| 明確な違反で CI を失敗させられる | 競合 primary 2 個の合成 snapshot で `evaluate` が exit 1(gate FAIL) | cli contract: evaluate.test.ts |
| すべての Fail に証拠がある | (1) evaluation スキーマが fail に evidence minItems 1 を強制。(2) 全 fail finding の evidence 非空をテストで走査。(3) 競合ボタンごとの image_region をユニットテストで検証 | spec contract / cli contract / evaluators unit |
| 同じ入力では同じ結果になる | 同一 artifacts に対する 2 回の `evaluate` がバイト同一。run_id も成果物ハッシュ由来で決定的 | cli contract + golden |
| 画像からタップ領域・Accessibility を推定しない(§12.2) | ui-snapshot 欠如時に全 metadata/a11y 評価器が unknown を返す(fail でも pass でもなく) | evaluators unit |
| 判定不能を無理に自動判定しない(§3.3) | summary.deterministic.unknown を fail と分離して集計 | evaluate contract |

## Golden(§19.3)

固定入力(合成 producer)→ `capture` → `evaluate` の出力全体を committed fixture と比較する Golden テストを cli test/golden に置く。更新手順は testing-strategy.md の規律に従う。

## 残余リスク(記録)

- primary-secondary-style-distinct の面積比 90% は §23.3 の近似であり、視覚スタイルの厳密比較は Phase 4 のモデル評価が担う(#12 の Why not 参照)。
- 実アプリの ui-snapshot 生成は Phase 6 E2E で撮影プロファイルに接続する。それまで実画面の決定的評価は artifact-presence 系のみが有効で、メタデータ系は unknown を返す(誠実な縮退)。
