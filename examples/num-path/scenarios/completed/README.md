# Scenario: completed — 日次パズル完了画面(Before)

MVP の評価対象状態(ADR-0002)。この記録は Issue #3 の成果物。

## Before 画像

- `before.png` — 2026-07-23 取得。iOS Simulator(iPhone 16 Pro 系, 1320×2868)、Locale ja-JP、Light Appearance、テストデータはシナリオ注入による固定値。
- 画面構成: 完了ヘッダー(達成チェック + ROUND 進捗)/ 連続日数カード + 週間ストリップ / 達成バッジ 2 種 / 翌日案内 + 通知リマインダーカード / 画面下部の主操作ボタン(練習)。

## 状態再現方法(Decision: Launch Argument)

- 対象アプリ既存のシナリオ注入機構(Launch Argument)でシナリオ `completed` を指定して起動し、画面 ready を示す accessibility identifier を待ってから撮影する。テストデータは Debug ビルド限定で本番処理から分離されている。
- Deep Link 案は不採用: アプリ側に新規実装が必要になり、既存の Launch Argument 機構が同じ決定性をゼロ実装で提供するため。
- アプリ側の追加変更は不要だった(既存機構をそのまま利用)。

## 再現性の検証記録(2026-07-23)

- 独立した 2 回の取得(クリーンビルド → シミュレータ起動 → 撮影)で画面コンテンツは完全一致。
- ピクセル差分は上部ステータスバー/Dynamic Island 領域(bbox x[471..849] y[66..149]、456 チャネル値)のみで、UI 情報領域の差分はゼロ。
- 帰結: 状態は決定的に再現できるが、PNG はバイト同一にならない。決定的評価(Phase 3)は画像バイト比較ではなく Accessibility Tree / UI メタデータを根拠にする(設計指示書 §12.2 の注意と一致)。
