# 0006: モデル評価の設計詳細(入力構成・human_review 分岐・一致率測定)

- Date: 2026-07-24
- Status: accepted
- Issue: #16, #18, #20
- 決定方式: decision-council 軽量ラウンド(Fable claude-fable-5 + Codex gpt-5.6-sol、独立 1 ラウンド)。全 3 問で独立収束・不一致ゼロのためチャレンジラウンドは実施していない(不一致時のみ実施の事前宣言どおり)。

## Decision

**Q1 入力構成** — 原則ごとの独立リクエスト。exemplar は対象原則の supports/violates のみ。**評価対象画像と同一ハッシュの exemplar は除外する**(自己参照によるラベル漏洩の防止。#20 で exemplar 画像を評価対象に使うときに必須)。before 画像は比較・回帰系チェックの opt-in のみ(送信データ最小化 §20.1)。

**Q2 human_review 分岐** — 三段構え: (1) §12.4 の既知条件を先に human_review へ、(2) モデル自身も verdict として human_review を選べる(§13.1 の 5 値)、(3) 保険として confidence < 0.70 の pass/warn を human_review へ昇格。閾値は品質確率ではなく**版管理されたルーティング方針**であり、#20 の較正データで見直す。昇格時は昇格前 verdict・confidence・閾値版を監査に残す。

**Q3 一致率測定(#20)** — 30 ケース全件 × 各 3 回実行。報告指標: 5 値 exact match + 混同行列(主)、2 値化(pass vs attention-required={warn,fail,unknown,human_review})+ Fail 見逃し率・誤検知率(併記)、判定の揺れ(3 回間の不一致率)、棄権率。**数値合格閾値は設けず**人間判断に委ねる(§13.2 の実証昇格・§24 と整合)。**claude CLI transport は探索測定のみ**(同一チョークポイント・監査経由を条件とする)。正式測定は SDK transport + API キー到着後に同一条件で再実行し、#20 の完了条件を「探索測定(provisional)」と「SDK 正式測定」に分離する。

## 記録された懸念と falsifier

- 個別リクエストは原則間衝突を見落とす → 既知の衝突(tradeoffs)は §12.4 条件で human_review へ。held-out 比較で一括が一致率・衝突検出とも優位なら再考。
- confidence が誤判定率と無相関なら閾値枝を削除し自己申告のみに縮退。
- 30 ケースは不均衡(pass 19 / warn 5 / fail 4 / unknown 2 / human_review 0)であり、総合 accuracy を意思決定に使わない。ケース拡充は Phase 4 の #20 で §19.4 カテゴリを足すときに解消。
- CLI と SDK の判定分布乖離が無いと確認されたら二重測定を廃止。

## Consequences

- #16 の builder に同一ハッシュ exemplar 除外を追加(本 ADR と同時に実装)。
- #18/#19 は本設計のまま評価器を接続。#20 は探索測定を claude CLI で先行し、レポートに provisional を明記。
