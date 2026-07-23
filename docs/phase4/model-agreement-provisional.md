# モデル一致率測定 — 探索測定記録 (Issue #20, PROVISIONAL)

**この測定は ADR-0006 Q3 の「探索測定」であり正典ではない。** transport は claude-cli(model: sonnet)。正式測定は SDK transport + conformance gate(ADR-0001 拘束 7)通過後に同一手順で再実行する。

## 条件

- ground truth: `examples/num-path/design-philosophy/expected-judgments.yaml`(30 ケース、人間ラベル)
- 30 ケース × 3 回 = 90 呼び出し。評価対象画像 = 各ケースの exemplar 画像(**同一ハッシュ exemplar は builder が自動除外** — ラベル漏洩防止、ADR-0006)
- confidence 閾値 0(昇格なしの素の verdict を測定)。再現手順: `node scripts/measure-model-agreement.mjs`

## 結果(summary は model-agreement-summary.json、生データは model-agreement-raw.json)

| 指標 | 値 |
| --- | --- |
| 5 値 exact match | 65.6% (59/90) |
| 2 値一致(pass vs attention) | **84.4% (76/90)** |
| **Fail/Warn の見逃し(attention→pass)** | **0.0% (0/27)** |
| 誤検知(expected pass → warn/fail) | 14.0% (8/57) |
| 棄権率(unknown/human_review) | 5.6% (5/90) |
| 判定の揺れ(3 回で不一致のケース) | 30.0% (9/30) |

## 読み方(§13.2 / §24 に基づき、合格閾値は設けない)

1. **見逃し 0% が最重要の結果。** 人間が attention とラベルした 27 呼び出しを一度も pass と誤らなかった。モデル評価の役割(warn として拾い、人間へ渡す)に対して安全側。
2. **exact match の構造上の上限は 86.7%。** response schema はモデルに fail を許さない(§13.2 をスキーマで強制)ため、expected=fail の 12 呼び出しは warn が正解挙動(confusion の fail→warn 12 はすべてこれ)。
3. 誤検知 8 件と揺れ 9 ケースは pass/warn 境界(boundary ラベルのケース)に集中しており、§19.4 の想定どおり境界事例の判定は揺れる。confidence 閾値 0.70 の human_review 昇格(#18)がこの帯域の保険になる。
4. n=30・単一モデル・探索 transport のため、この数値でゲート昇格(deterministic 化)の判断はしない。

## 既知の制限

- claude-cli transport は逐次実行(spawnSync)。正式測定の SDK transport では非同期化する。
- ケース分布が不均衡(pass 19 / warn 5 / fail 4 / unknown 2)。§19.4 カテゴリの拡充は運用フェーズで行う。
