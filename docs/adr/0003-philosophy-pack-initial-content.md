# 0003: Philosophy Pack 初期内容の確定方針(事例画像・severity・期待判定)

- Date: 2026-07-24
- Status: accepted(ただし ADR-0002 の accepted 化を前提条件とする)
- Issue: #2
- 決定方式: decision-council(Fable + Codex、独立→チャレンジ→議長合成)

## Decision

**Q1 事例画像の調達 — 採用例3・却下例3の全6件を合成モックアップとする。**

- 全件を同一レンダラー・同一寸法・同一画面シェルから生成し、「描画スタイルの差=ラベル」という交絡を作らない。
- モックアップのソースと描画条件をコミットし、クリーン環境で決定的に再生成できること(再生成ハッシュ比較で検証)。
- 事例メタデータに合成である旨を明示し、実在の製品履歴と誤認させない。
- 実アプリの Before 画像は Pack の事例に**含めない**。改善対象そのもの(初期表示に補助情報が並ぶ状態)を accepted の ground truth にすると校正が汚染されるため。Before は Pack 外の校正・外的妥当性測定用データとして扱い、Pack 調整には使わない(手続き的ブラインド)。

**Q2 severity 割当 — 草案どおり focus.single-primary-decision と consistency.use-established-components を fail、他 3 原則を warn とする。ただし以下を契約とする:**

1. model-based finding は原則の severity に関わらず CI を停止しない(§3.3/§13 の契約化)。fail は決定的検査のみが発生させる。
2. `required-elements-present` は原則 severity から独立したタスク充足ゲートとして扱う(タスク定義「完了の事実と連続記録は残す」の直接検証のため)。
3. 決定的検査は有効化前に信頼性検証を行う: 現行コードでの baseline dry-run(特に `hardcoded-style-values == 0` の恒久赤 CI 防止)、同一入力反復での決定性、人間ラベルとの誤検知率。不安定な検査は warn へ降格する(falsifier)。

**Q3 期待判定リスト — 独立した判定ケースファイルを正典とする。ただしスコープガード付き:**

- Phase 0 の内容は 6 exemplar × 5 principle の全 30 ペア(疎にせず全て明示)+任意の境界ケース。
- フィールドは正典既存語彙のみ: exemplar 参照 / principle 参照 / expected_verdict(§13.1 の 5 値: pass / warn / fail / unknown / human_review)/ §19.4 分類タグ / rationale。新語彙の発明は Phase 1 以降。
- ground truth の verdict と CI severity は別概念として分離する(期待判定は人間ラベルであり CI 出力ではない)。
- マトリクス表示の生成器は Phase 0 では作らない。§19.4 の全カテゴリ(境界・原則衝突・情報不足等)の網羅は Phase 3/4 の Evaluator 導入ゲートで要求し、Issue #2 の完了条件には追加しない。

**共通の前提条件:**

- Pack の全ファイルは素の YAML として parse 可能であること(CI で lint)。草案にあった非 YAML 注記行は排除する。
- ADR-0002(対象画面とタスク)が accepted であること。proposed のままの間、本 ADR も暫定扱い。

## Alternatives & dissent

- Q1 ハイブリッド(採用例=実画面): 実画面は 1 状態のみで意味の異なる採用例 3 件を提供できず、かつ現行画面は改善対象側。両席一致で不採用。ただし「公開可能な複数の良い実画面状態が確認されれば再考」という falsifier を両席が残した(盲検比較で有意差が条件)。
- Q3 は**クロススイッチ**が発生した: Fable 席は初回「マトリクス」→チャレンジで「ケースファイル」へ(根拠: §13.1/§19.4 が語彙を既定義でありスコープ衝突論の前提が崩壊 + 修正版マトリクスがケース集合と情報等価という自己矛盾 + YAML 全面書き直しの実測)。Codex 席は初回「ケースファイル」→「完全マトリクス」へ(根拠: §19.4 の期限を Phase 0 と同一視した論理誤り + 30 ペアは無損失相互変換可能)。両変更とも有効根拠付き(説得によるものではない)。議長裁定: 30 ペア自体は両形式で無損失だが、原則衝突ケース等の非セル型ケースは単一 (exemplar, principle) セルに帰属できず、マトリクス正典は Phase 3/4 で第二形式の導入(=移行)を強いる。O1 の failure condition(後工程での作り直し)を唯一回避するのはケースファイルであり、Codex 席のスコープ懸念は「正典語彙のみ・30 ペア限定・生成器なし」のガードで吸収した。Codex 席の (a) への残存支持と round-trip テスト(無損失・暗黙推測ゼロで (a) 復帰)は falsifier として保存する。

## Consequences

- Issue #2 の成果物 = principles.yaml(5 原則)+ exemplars(6 件の画像・ソース・rationale)+ expected-judgments.yaml(30 ケース)。配置は `examples/num-path/design-philosophy/`。
- Phase 3(#12-#15): 決定的検査の信頼性検証(Q2-3)をゲート有効化の前提に組み込む。
- Phase 4(#20): 人間ラベル事例セットは本ケースファイル形式を拡張して作る(§19.4 カテゴリの追加はこの時点)。
