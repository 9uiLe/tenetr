# Repository Instructions

## What this repository is

tenetr は **Design Philosophy Harness** の参照実装。プロダクト固有のデザイン哲学(原則・採用例・却下例・過去の意思決定)を、AI Agent の設計・実装・評価プロセスへ再現可能な形で組み込む TypeScript monorepo。初期対象は iOS アプリ(num-path)の既存画面改善。

正典ドキュメント:

- 仕様の正典: `docs/design-philosophy-harness-implementation-guide.md`(以下「設計指示書」。§番号の参照はすべてこの文書)
- 作業計画の正典: [GitHub Project 4](https://github.com/users/9uiLe/projects/4)(Issue #1〜#29、Phase 0〜7)
- 意思決定の正典: `docs/adr/`(Decision Record。連番 `NNNN-slug.md`)
- 開発ワークフローの正典: `docs/engineering/development-workflow.md`

## Architecture

設計指示書 §6–§7 が確定させている構成(変更には Decision Record が必要):

- **pnpm workspace monorepo**。中核は TypeScript。Swift は iOS 固有の成果物取得アダプターに限定し、Harness の中核を Swift 専用にしない。技術スタックの確定値と拘束は `docs/adr/0001-technology-stack.md` が正。
- パッケージ構成と依存方向(consumer → dependency のみ許可。逆流・循環は禁止):
  - `packages/spec` — 4種 JSON Schema(`schemas/` が正典)と生成 TS 型。依存なし
  - `packages/core` — Pack Loader、Context Resolver、Intent Compiler → spec
  - `packages/evaluators` — Deterministic / Model / Human の 3層 Evaluator → spec, core
  - `packages/reporters` — JSON / HTML レポート生成 → spec, core
  - `packages/ios-adapter` — シナリオ起動・スクリーンショット・Accessibility Tree 取得 → spec
  - `packages/cli` — `design-harness` CLI(init / validate / resolve / capture / evaluate / report / replay)→ 上記すべて
  - `skills/`(Agent Skills + Claude Code / Codex アダプター)と `examples/num-path/`(サンプル Pack・シナリオ証拠)は workspace 外・ビルド対象外
  - `.github/workflows/` — reusable design-review workflow + CI(Phase 7)
- exit code 0-4 のマッピングは cli 内の単一モジュールに集約する(ADR-0001 拘束 2)。テストは `test/unit|contract|golden/` のディレクトリで 3 層に区別する。
- 評価は3層に分離: **Deterministic**(CI を Fail にできる唯一の層)/ **Model-based**(MVP では Warn または Human Review 止まり。モデル評価のみで CI を落とさない)/ **Human-only**。
- `validate` の終了コード契約: 0=有効, 1=スキーマ違反, 2=参照切れ, 3=意味的矛盾, 4=実行環境エラー。
- モデル評価の出力は JSON Schema で強制する(自由文をレポートへ大量転載しない)。
- 技術スタックの個別選定(テストランナー、schema validator、CLI framework 等)は `docs/adr/` を正とする。

## Commands

```bash
pnpm install                 # 依存導入
pnpm build                   # 全パッケージビルド
pnpm test                    # 全テスト (unit / contract / golden)
pnpm lint                    # lint + format 検査
pnpm check                   # build + test + lint の毎コミット正規入口
pnpm --filter <pkg> test     # パッケージ単体テスト
```

`pnpm check` が通らないコミットを作らない。`--no-verify` や検査の無効化で回避して完了扱いにしない。CI を最終防衛線とする。

## Development workflow

- 作業単位は GitHub Project の Issue。Phase 順(0→7)と Issue の Dependencies を尊重する。
- ブランチ: `feat/issue-<番号>-<slug>` / `chore/<slug>`。PR は master 向け、1 Issue = 1 PR を基本とする。
- PR 本文には対象 Issue(`Closes #N`)、Verification チェックリストの充足証拠、判断が必要な残項目を書く。
- Issue の Verification チェックリストが完了条件。証拠(コマンド出力、生成物、スクリーンショット)を Issue または PR へ残す。
- 次に該当する変更は、実装 PR と分離した Decision Record(`docs/adr/`)を必須とする:
  - Philosophy Pack の原則・事例・severity の変更
  - Evaluator の削除・severity 引き下げ
  - アーキテクチャ・技術スタックの変更
- 帰結の大きい選択(アーキテクチャ、評価設計、外部送信データ)は decision-council(Fable / Codex の独立助言 + 反論)で検討してから ADR に落とす。ADR には dissent(不採用意見)も記録する。
- 頻出する作業手順は `.claude/skills/` の project skill として結晶化する。同じ手順を 2 回チャットで説明したらスキル化を検討する。

## Security

- **本リポジトリは public。** コミット・Issue・PR に書いてよいのは本 Harness 自身の情報のみ。
- 検証対象アプリ(num-path 等)は private な個人開発物。その内部情報(ソースコード、リポジトリ構成、ローカルパス、設定値、未公開機能)を本リポジトリへ書かない。名前と、公開済み Issue が既に参照している設計レベルの情報(§23 のシナリオ等)のみ可。
- 評価証拠のスクリーンショットは公開して問題ない画面状態のみを使い、設計指示書 §20 に従い必要に応じてマスキングする。
- 個人環境の情報(ローカル絶対パス、メールアドレス、マシン構成)をコミット内容・コミットメッセージに含めない。
- 外部モデルへ送信するデータは設計指示書 §20 の制御に従う(個人情報・機密・API キー・デバッグログを送らない)。
- 秘密情報(API キー等)はリポジトリへコミットしない。環境変数または CI Secrets を使う。

<!-- intent-placement:start -->
## Intent Placement — How / What / Why / Why not

情報は、それが最も長く正確に保たれる単一の場所へ置き、別の場所へ重複させない。

- **Production code is How.** 処理がどう動くかは、型・名前・制御フロー・依存関係でコード自身に語らせる。処理手順をコメントで実況しない。
- **Test code is What.** テストを実行可能な仕様書とし、テスト名と assertion で「どの条件で何が観測されるべきか」を表明する。実装手順を写経しない。
- **Commit log is Why.** non-merge commit の `Why:` section に、変更が必要になった背景・制約・選択理由を残す。変更ファイルの列挙を Why の代わりにしない。
- **Code comments are Why not.** 通常コメントは、コードから読み取れない制約、または自然に見える代替案を採用しなかった理由だけを記録する。該当する情報がなければコメントを書かない。

Machine-enforced forms:

- Production/test の通常コメント: `// Why not: <rejected alternative> | Reason: <reason>`
- Test contract: 条件と observable result を表す descriptive な test 名(`describe`/`it`)+ assertion。識別子だけで契約を表せない場合のみ宣言直前の `// What: ...` で補い、同じ内容を重複させない
- Commit message:
  ```text
  <imperative summary>

  Why:
  <problem, constraint, and reason for this choice>
  ```
- 一時例外は Why not に Issue と削除条件を含める。`--no-verify` で回避して完了扱いにしない。CI を最終防衛線とする。

Allowed comment exceptions:

- public API の TSDoc documentation comment(外部契約のみ。実装実況は不可)
- license、shebang、formatter/compiler/tool directive(`eslint-disable` 等。ただし手書き理由は同じ comment block の `Why not:` に統合する)
- test 宣言に結び付く補助的な `What:` contract(descriptive な test 名と重複させない)
- generated file の header(生成元と「直接編集禁止」を明示)
<!-- intent-placement:end -->
