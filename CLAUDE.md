リポジトリ全体の正典は `AGENTS.md`。最初に読むこと。

仕様の正典は `docs/design-philosophy-harness-implementation-guide.md`、作業計画の正典は [GitHub Project 4](https://github.com/users/9uiLe/projects/4)、意思決定の正典は `docs/adr/`。

<!-- intent-placement:start -->
## Intent Placement — How / What / Why / Why not

情報は、それが最も長く正確に保たれる単一の場所へ置き、別の場所へ重複させない。

- **Production code is How.** 処理がどう動くかは、型・名前・制御フロー・依存関係でコード自身に語らせる。処理手順をコメントで実況しない。
- **Test code is What.** テストを実行可能な仕様書とし、テスト名と assertion で「どの条件で何が観測されるべきか」を表明する。実装手順を写経しない。
- **Commit log is Why.** non-merge commit の `Why:` section に、変更が必要になった背景・制約・選択理由を残す。変更ファイルの列挙を Why の代わりにしない。
- **Code comments are Why not.** 通常コメントは、コードから読み取れない制約、または自然に見える代替案を採用しなかった理由だけを記録する。該当する情報がなければコメントを書かない。

Machine-enforced forms と例外規約の全文は `AGENTS.md` の同名セクションを正とする。
<!-- intent-placement:end -->
