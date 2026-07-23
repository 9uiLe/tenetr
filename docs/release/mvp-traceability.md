# MVP トレーサビリティ監査(Issue #29)

§22 の受け入れ条件と §25 の完成の定義(10 条件)を、証拠(Issue / PR / テスト / 成果物)へ対応付ける。CI で恒久検証されるものはテスト名を、人間判断・実測記録は成果物パスを示す。

## §22.1 機能

| 条件 | 状態 | 証拠 |
| --- | --- | --- |
| Philosophy Pack を読み込める | ✅ | #7 / validate-exit-codes.test.ts(例 Pack exit 0) |
| スキーマエラーを具体的に表示できる | ✅ | #7 / 「exits 1 with a specific message」テスト(instancePath 付き stderr) |
| タスクから適用原則を抽出できる | ✅ | #9 / resolve-intent.test.ts(5 原則+理由) |
| Design Intent Contract を生成できる | ✅ | #9 / resolve-intent.golden.test.ts(§19.3 Golden) |
| iOS 画面を同一条件で取得できる | ✅ | #3 実測記録(examples/num-path/scenarios/completed/README.md: 2 回取得で内容一致)+ #10 scenario 契約 + #11 capture |
| Deterministic 評価を実行できる | ✅ | #12-#14 / evaluate.test.ts |
| Model 評価を実行できる | ✅ | #16-#18 / module transport テスト + #26 実画面実測(docs/phase6/e2e-run/) |
| Human Review へ分岐できる | ✅ | #18 / 閾値昇格ユニットテスト + #26 実測(2 件昇格) |
| JSON レポートを生成できる | ✅ | #21 / report.test.ts |
| HTML レポートを生成できる | ✅ | #21 / 11 セクション順序テスト |
| Run Manifest を保存できる | ✅ | #22 / run-replay.test.ts(schema 自己検証込み) |
| Agent Skill から一連の処理を実行できる | ✅ | #24 skill + #26 E2E 記録(手順遵守) |
| GitHub Actions で Artifact を保存できる | ✅ | #27 / design-review-example workflow(PR #60 で実走 success・artifact upload) |

## §22.2 品質

| 条件 | 状態 | 証拠 |
| --- | --- | --- |
| Fail には必ず証拠がある | ✅ | evaluation スキーマの if/then 強制 + evaluate.test.ts の全 fail 走査 |
| 判断と観測事実が分離されている | ✅ | Finding.observations / judgment 分離(スキーマ + レポート表示) |
| 同じ決定的入力は同じ判定になる | ✅ | evaluate 2 回実行のバイト同一テスト + evaluate.golden + replay |
| モデル情報と Prompt Hash が保存される | ✅ | run-manifest.model_evaluation(provider/model)+ egress-audit.json の payload_sha256(Manifest の artifacts に収載し replay 検証下) |
| 不明点を Unknown または Human Review として返せる | ✅ | ui-snapshot 欠如時 unknown テスト + response schema 違反時 unknown + 閾値昇格 |
| Agent が Pack を書き換えて評価を回避できない | ✅ | #28 governance CI + branch protection(enforce_admins) |
| レポートだけで修正方針が理解できる | 🔶 Human | #23 受け入れ記録(docs/phase5/report-acceptance.md)。E2E レポート実物を根拠にユーザー承認を求める |

## §22.3 運用

| 条件 | 状態 | 証拠 |
| --- | --- | --- |
| Pack 変更時に Decision Record が必要 | ✅ | #28 / check-pack-governance.mjs(CI 必須ジョブ) |
| Rubric 変更がバージョン管理される | ✅ | 同上(philosophy_version 強制)+ ADR-0003 |
| 評価器ごとの Version が保存される | ✅(注) | evaluator は harness と同一パッケージで版管理され、manifest の versions.harness が evaluator 群の版を一意に決める。個別版は将来 evaluator 分離時に導入 |
| 過去 Run を replay できる | ✅ | replay コマンド + 改ざん検知テスト |
| モデル評価をオフにしても決定的評価が動く | ✅ | evaluate の既定が off(全 contract テストが該当経路) |

## §25 完成の定義

| # | 条件 | 状態 | 証拠 |
| --- | --- | --- | --- |
| 1 | 人間が自然言語で画面改善タスクを入力できる | ✅ | task.yaml(自然言語 description)→ resolve |
| 2 | Harness が適用原則と事例を選べる | ✅ | resolve の Pack 駆動抽出(Golden) |
| 3 | Agent が Design Intent Contract に沿って実装できる | ✅(注) | Skill の行動契約(#24)+ ready_to_implement ゲート(§9.3)。実アプリの改善実装は運用フェーズの作業で、本 MVP は Before ベースライン評価まで(#26 記録に明示) |
| 4 | 対象画面を再現可能な条件で取得できる | ✅ | #3 再現実測 + scenario/profile 契約 |
| 5 | 明確な違反を決定的に検出できる | ✅ | gate FAIL テスト(競合 primary) |
| 6 | 曖昧な品質をモデル評価で補助できる | ✅ | #26 実測(warn: 初期表示の情報過多) |
| 7 | 自動判定できない内容を人間へ戻せる | ✅ | human_review 2 件の実測 + レポートのセクション 8 |
| 8 | すべての判断に証拠とバージョン情報がある | ✅ | evidence 強制 + manifest versions + egress audit |
| 9 | 後から同じ成果物を再評価できる | ✅ | replay(バイト同一検証) |
| 10 | Agent を変更しても Pack と評価結果を再利用できる | ✅ | #25(Claude/Codex 双方の CLI 実行証拠。全成果物がファイル契約) |

## 未達項目と対応方針

1. **#23(レポート単独判断)** — Human-only。受け入れ記録の PR マージ(包括承認)を暫定承認とし、異議があれば再設計する。
2. **モデル評価の正式測定** — ADR-0006 のとおり claude-cli による探索測定(docs/phase4/)まで。SDK transport + conformance gate(ADR-0001 拘束 7)は API キー導入後の運用タスク(MVP 範囲は §4.2 の「モデル評価の実行」であり充足)。
3. **実アプリ改善実装の After 評価** — Harness の運用開始後の最初のタスク。Before ベースラインと改善方向(warn 指摘)は本 MVP が提供済み。
