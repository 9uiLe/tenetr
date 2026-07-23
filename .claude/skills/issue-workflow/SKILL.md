---
name: issue-workflow
description: tenetr の GitHub Project Issue を選定し、実装からPR作成・証拠記録まで正典ワークフローで進める。Issue 着手、PR 作成、完了報告、次の作業選定のときに使う。
---

# Issue Workflow

正典は `docs/engineering/development-workflow.md`。このスキルはその実行手順への入口であり、内容を複製しない。

1. `docs/engineering/development-workflow.md` を読む(短い。全文読むこと)。
2. Issue 選定は §1 のコマンドで行い、`Agent readiness` の区分に従う。
3. 実装は §2、完了判定は §3(Verification チェックリスト + 証拠)、PR は §4 のテンプレートに従う。
4. PR 作成前に §4 のメタ認知レビューを必ず実施する。
5. ADR が必要な変更(§5 の列挙)に該当するか着手前に確認する。該当したら decision-council(§6)を先に実施する。
