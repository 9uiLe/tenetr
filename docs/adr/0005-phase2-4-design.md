# 0005: Phase 2-4 設計 — capture 境界・UI メタデータ契約・外部送信制御

- Date: 2026-07-24
- Status: accepted
- Issue: #10, #11, #12, #13, #16, #17
- 決定方式: decision-council(Fable claude-fable-5 + Codex gpt-5.6-sol xhigh、独立回答)。両席が 3 問すべてで同一オプションへ独立収束し、ガード条件が相補的(矛盾ゼロ)だったため、チャレンジラウンドは圧縮した(プロトコル逸脱として明示。相違が生じた場合の通常手順は維持)。

## Decision

**Q1 capture のアダプター境界 — コマンド委譲契約。ただし信頼境界ガード付き:**

1. Pack の scenario 定義が宣言できるのは **capture プロファイル ID・必要成果物・環境条件のみ**。実行可能コマンドそのものを Pack に書かない(PR で書き換え可能なファイルからの任意コード実行を遮断。Codex 席 B-E5)。
2. 実際の実行コマンドは利用者側の信頼済み設定(リポジトリ外または protected な consumer config)で解決する。実行は shell 非経由(`shell: false`)・環境変数 allowlist・timeout・出力先の閉じ込め付き。
3. 撮影側は `capture-result.json`(成果物一覧・デバイス・環境情報)を返し、ios-adapter は成果物の存在検証・環境整合性検査・sha256 計算・環境情報の Manifest 転記のみを担う。シミュレータ駆動やビルドはアダプターの責務にしない(既存の決定的手段の二重実装を避ける。E1/E5)。
4. XCUITest テンプレート(案 c)は将来の fallback として保持(Codex 席 B-P4)。

**Q2 決定的 Evaluator の入力契約 — tenetr 正規化 UI スナップショットスキーマ:**

1. `ui-snapshot` スキーマを `packages/spec` の **5 番目の契約**として追加する(本 ADR がその追加を承認する)。§16.3 の項目列(role / label / identifier / frame / enabled / hittable / 画面サイズ)を正典とする。
2. 意味忠実性の拘束: 取得不能と false を混同しない(tri-state / optional)、座標系・単位・scale・原点の明文化、取得ツール名とバージョンの記録、生ダンプは正規化後も hash 付き成果物として保存。
3. Evaluator は正規化スキーマのみを消費する。プラットフォーム生形式のパースは adapter 内に閉じる。合成 fixture により Evaluator を ubuntu CI でテスト可能にする(public repo に実アプリのダンプを置かない)。
4. 復帰条件: 異種取得ツール間で必須属性の意味保存が不可能と判明したら、共通 envelope + 型付き platform extension のハイブリッドへ変更(Codex 席 falsifier)。

**Q3 外部モデル送信制御 — 単一チョークポイント + fail-closed:**

1. 外部モデルへの送信は provider transport モジュール経由のみ(ADR-0001 拘束7 を送信制御に拡張)。
2. **closed-world 許可リスト**: 承認済みの型付きフィールド・成果物 ID のみ通過(deny-by-default)。分類不能なデータ・公開可否が未判定の画像は**送信せずモデル評価を無効化**する(fail-closed。O2 を情報量削減で守る)。
3. 画像マスキングはマスク領域を scenario/pack が宣言し、チョークポイントが適用する。マスク・許可リスト定義の変更は Decision Record 必須の protected 変更とする(#28 と接続)。
4. 監査契約を run-manifest スキーマへ拡張する(minor bump): 送信判定の記録、ポリシーのバージョン、除外された項目、送信 payload の hash。
5. 有効化ゲート: リモート送信を有効にする前に、敵対的バイパステスト(seeded-sensitive データが遮断されることの negative test)を通過すること(Codex 席 B-P12)。transport 外での SDK/HTTP 利用を禁止する依存 lint を CI に置く(Fable 席 F-P5)。

## スコープ外だが記録する発見

- **CI artifact 流出経路**(Fable 席 F-P6): public リポジトリの GitHub Actions artifact に private アプリの capture 成果物を載せると、モデル送信制御と無関係に流出する。Phase 7 (#27) の workflow 設計に「artifact の公開可否分類と保持方針」を必須要件として追加する。

## Alternatives & dissent

- Q1 (b) シミュレータ直接駆動: アプリ固有詳細(ビルド設定・スキーム)への依存が public リポジトリへ滲む構造圧力があり、既存手段の二重実装になるため両席とも不採用。(c) XCUITest 必須: 存在しないものの新設強制であり MVP 速度に反する。fallback として保持。
- Q2 (b) 生ダンプ直接パース: 単一ツールの短期 spike にのみ有効(adapter 内 PROTOTYPE ONLY)。公開入力契約にはしない。
- Q3 (b) Evaluator 分散組み立て: 送信ポリシーの分散は検査点の増殖を招き、最小送信の利得は (a) の「Evaluator が要求フィールドを宣言し、チョークポイントが宣言外を落とす」で代替可能なため両席とも不採用。
- 両席の確信度: Q1 0.80 / MEDIUM-HIGH、Q2 0.80+ / HIGH、Q3 0.92 / MEDIUM-HIGH(現提案のままでは MEDIUM、上記拘束の採用で引き上げ)。

## Consequences

- #10: scenario 定義はプロファイル ID・成果物・環境条件のみを宣言する形式で確定。
- #11: ios-adapter は「実行(信頼済み設定から解決)・検証・正規化・ハッシュ」を実装。ui-snapshot スキーマを spec へ追加。
- #12/#13: Evaluator は ui-snapshot 正規化データのみを消費。合成 fixture で CI テスト。
- #16/#17: 送信チョークポイント + fail-closed ポリシー + 監査契約拡張 + バイパステスト + 依存 lint。
- 再検討トリガー: 各 Decision 内の復帰条件・falsifier のとおり。
