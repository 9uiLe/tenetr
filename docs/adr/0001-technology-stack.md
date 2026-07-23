# 0001: 技術スタック確定(スキーマ / テスト / CLI / ビルド / モデル評価 API)

- Date: 2026-07-23
- Status: accepted
- Issue: #4(および #5, #6, #7, #16 の前提)
- 決定方式: decision-council(Fable + Codex の独立助言 → 匿名化チャレンジ → 議長合成)。要旨は本文、詳細な経緯は末尾の Process 節。

## Context

設計指示書は TypeScript monorepo・pnpm workspace・CLI 動詞と exit code 契約・4種 JSON Schema・3層評価を確定しているが、個別ライブラリは指定していない(文書中に Ajv/Vitest 等の語は出現しない)。O1「スタック起因の乗り換え作業ゼロで MVP 完成」、O2「`pnpm check` 単一入口の決定的再現」を成果条件として選定した。

## Decision

| # | 領域 | 決定 | 固定バージョン(2026-07-23 registry 実測) |
|---|---|---|---|
| S1 | スキーマ | **手書き JSON Schema(draft 2020-12)を正典**とし `packages/spec/schemas/` に配置。Ajv で検証、json-schema-to-typescript で TS 型生成 | ajv 8.20.0 / json-schema-to-typescript 15.0.4 |
| S2 | テスト | **Vitest**。projects 機能で Unit / Contract / Golden を CI で区別実行 | vitest 4.1.10 |
| S3 | CLI | **commander**。ただし parser に終了処理を所有させない(下記制約) | commander 15.0.0 |
| S4 | ビルド | **tsc のみ・Pure ESM**。`engines.node >= 22`(LTS 下限)。バンドラ・デュアルパッケージなし | typescript 7.0.2 |
| S5 | モデル評価 API | **条件付き: @anthropic-ai/sdk 直接 + tool-forced JSON を既定方向**とし、Phase 4 実装開始前の conformance spike を通過条件とする(下記) | @anthropic-ai/sdk 0.113.0 |

付随する拘束(実装はこれを満たすこと):

1. **スキーマ鮮度**: 型生成の再実行で `git diff` が空であることを `pnpm check` に組み込む(ドリフトの機械的排除)。
2. **exit code 所有権**: exit code 0-4 のマッピングは単一モジュールに集約し、commander の既定 exit 挙動に委ねない(typed handler + injected I/O)。全コマンド×全 exit code の Contract テストを持つ。
3. **配布健全性**: package exports / `.js` import specifier / shebang / アセット配置を明示し、clean 環境での fresh-install smoke test を CI に置く(「CI は通るが CLI として壊れている」の防止)。
4. **依存 pin**: 全依存を lockfile + 明示 pin(caret 幅なし)。更新は PR 経由。
5. **決定性テスト**: 同一 suite の連続複数回実行で出力同一性を検証するテストを持つ。
6. **dev proxy 隔離**: production のモデル評価設定は localhost 系エンドポイントを拒否する。暗黙の BASE_URL 継承を許可しない。
7. **S5 conformance gate(Phase 4 実装開始前に必須)**: 凍結済み evaluation スキーマを tool input schema として production API へ渡し、代表プロンプト N=20 で全件 Ajv 準拠を確認する。SDK import は provider transport モジュール内に閉じ込め、返却 JSON はローカルで Ajv 再検証する。**gate 失敗時は S5 を再決定する**(本 ADR の追記で記録)。

## Alternatives & dissent

- S1 **TypeBox**(型とスキーマの単一定義): 両アドバイザーが最有力対抗として認定。ドリフト事故を原理的に排除できるが、公開契約が生成物になる点と pre-1.0(0.34.x)である点で不採用。拘束 1 がドリフト懸念を機械化で相殺する。
- S2 **node:test**(依存ゼロ): ランナー起因の手戻りが定義上ゼロという強み。3 層区別実行・snapshot の自作グルーが必要で不採用。falsifier: 30 行以内のグルーで §19 要件を再現するデモが出れば再考。
- S3 **clipanion / citty**: in-process 実行や Pure ESM 特化の利点はあるが、普及度・Agent 既知度で commander に劣後。
- S4 **tsup 単一バンドル**: 外部配布・単一 artifact 要件が実在しない現時点では複雑性のみ。npm 公開や CJS 消費者が確定したら再考(その時点で ADR 追記)。
- S5 **明示的な不一致(記録)**: Codex 席は「defer + 判別ゲート」、Fable 席は「既定値 (a) + 反証条件」を最終維持した(説得による転向はゼロ)。両者は同一の判別テストに収束しており、不一致の残余は「不確実性下で ADR に何を記録するか」という様式の価値判断である。議長は「既定方向 (a) + 必須 gate」の条件付き決定として両立場を保存した。gate は Codex 席の dissent を構造的に残すもので、通過するまで (a) は確定しない。

## Consequences

- Phase 1 の scaffold(#4)はこの構成で直ちに着手できる。
- 決定の再検討トリガー: (i) S5 gate 失敗、(ii) 外部 CJS 消費者・npm 公開要件の確定(S4)、(iii) スキーマが 2020-12 で表現不能な制約に遭遇(S1)、(iv) Vitest のメジャー破壊的変更が pin 更新を妨げる(S2)。
- lint/format ツールチェーンは本 ADR のスコープ外(Phase 1 で `pnpm check` 構成時に決定し、必要なら ADR 追記)。

## Process(decision-council 記録)

- Evidence readiness: PASS(設計指示書・Issue 本文・ツールチェーン実測・npm registry 実測)。パケットは議長キュレーションのため、両アドバイザーへ欠落指摘を要求し、指摘(JSON Schema draft 未指定、Node support matrix、npm 配布有無、ライブラリ現行版)は本 ADR の拘束・再検討トリガーへ反映した。
- 参加者: Fable 席 = claude-fable-5(effort high、ランタイム識別を出力で検証)/ Codex 席 = gpt-5.6-sol(codex-cli 0.145.0、effort xhigh、セッションバナーで検証)。補助証言として claude-sonnet-5 の独立回答 1 件(座席外・重み低)。
- プロトコル事象: Fable 席の初回 dispatch がホスト内サブエージェント経路で claude-sonnet-5 へサイレント代替されていることをランタイム自己申告で検出。該当出力を補助証言へ降格し、Fable 席を直接 CLI 経路で再確保した(transport gate 再検証 PASS)。
- チャレンジ結果: 両者とも推奨変更なし(PERSUASION_ONLY 転向ゼロ)。相互の拘束提案を双方が取り込み(計 12 件)、S5 の判別テストに収束。challenge-guard 検証: valid / protocolClean。
- 議長確信度: S1-S4 は HIGH(異種 2 席一致 + 拘束で残懸念を機械化)。S5 は MEDIUM(能力証拠が推論のみのため gate 通過まで確定させない)。
