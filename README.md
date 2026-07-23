# tenetr — Design Philosophy Harness

プロダクト固有のデザイン哲学(原則・採用例・却下例・過去の意思決定)を、AI Agent の設計・実装・評価プロセスへ**再利用可能かつ再現可能**な形で組み込む Harness の参照実装。

- 仕様の正典: `docs/design-philosophy-harness-implementation-guide.md`
- リポジトリの読み方: `AGENTS.md`(最初に読む)
- 意思決定の記録: `docs/adr/`

## クイックスタート

```bash
pnpm install && pnpm build

# Pack の検証 (exit: 0=有効 1=スキーマ違反 2=参照切れ 3=意味的矛盾 4=実行環境エラー)
node packages/cli/dist/bin.js validate --pack examples/num-path/design-philosophy

# タスク → Design Intent Contract
node packages/cli/dist/bin.js resolve \
  --pack examples/num-path/design-philosophy \
  --task examples/num-path/task.yaml --out intent.json

# 一気通貫 (resolve → capture → evaluate → report → run-manifest)
node packages/cli/dist/bin.js run \
  --pack examples/num-path/design-philosophy \
  --task examples/num-path/task.yaml \
  --scenario completed \
  --profiles examples/num-path/ci-profiles.yaml \
  --out ./run-out

# 過去 Run の再評価 (成果物ハッシュ検証 + バイト同一性判定)
node packages/cli/dist/bin.js replay --manifest ./run-out/run-manifest.json \
  --pack examples/num-path/design-philosophy
```

新しいプロダクトへの導入は `init`(雛形生成)から。Agent 向けの行動契約は `skills/agent-skills/design-philosophy-compliance/SKILL.md`。

## 構成

- `packages/spec` — 5 つの JSON Schema 契約(philosophy-pack / design-intent / evaluation / run-manifest / ui-snapshot)と生成型
- `packages/core` — Pack loader・4 段階検証・resolve・manifest
- `packages/evaluators` — 決定的評価(3 層分離)・モデル評価(構造化出力強制・egress チョークポイント)
- `packages/reporters` — 11 セクション HTML / JSON レポート(証拠領域ハイライト)
- `packages/cli` — `design-harness`(validate / init / resolve / capture / evaluate / report / run / replay)
- `packages/ios-adapter` — 信頼済みプロファイルによる capture 実行・検証・ハッシュ
- `skills/` — Agent Skill 本体と Claude Code / Codex アダプター
- `.github/workflows/reusable-design-review.yml` — 利用側リポジトリから呼び出す CI 統合

## 設計上の要点

- 評価は 3 層: **Deterministic**(CI を停止できる唯一の層)/ **Model-based**(warn・human_review 止まり)/ **Human**
- モデルへの外部送信は単一チョークポイント経由(deny-by-default・マスキング・監査ログ)
- Pack の変更は Decision Record 必須(CI で機械的に強制)
- 同一入力 → バイト同一の評価(replay で検証可能)

## License

[MIT](LICENSE)
