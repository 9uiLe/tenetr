# スキーマバージョニング方針

対象: `packages/spec/schemas/` の 4 契約(philosophy-pack / design-intent / evaluation / run-manifest)。

## ルール

1. **インスタンスは `schema_version` を宣言する**(`"<major>.<minor>"` 形式)。スキーマは `^1\.\d+$` のように**現行 major のみ**を受理する。
2. **minor** = 後方互換の追加(optional フィールド追加、enum 値追加)。既存インスタンスは変更なしで妥当のまま。
3. **major** = 破壊的変更(required 追加、フィールド削除・改名、値域の縮小)。major を上げる変更は Decision Record を必須とし(AGENTS.md)、旧 major の受理を止める場合は `replay`(§15)対象の過去 Run を再検証できる移行手順を ADR に書く。
4. スキーマファイル自体の変更は必ず `pnpm --filter @tenetr/spec codegen` の再実行とセットで行う。生成型の鮮度は `pnpm check` 内の `codegen:check` が機械検査する(ADR-0001 拘束 1)。
5. 4 スキーマの version は独立に進めてよいが、cross-schema の値語彙(verdict 5 値、severity 2 値、principle/exemplar の ID 形式)は philosophy-pack スキーマの `$defs` を正とし、他スキーマは同じ値域を再宣言する場合に乖離させない(Contract テストが実質の防衛線)。

## 現行

全スキーマ major = 1。インスタンス宣言は `"1.0"`。
