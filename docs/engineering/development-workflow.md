# Development Workflow

AI Agent・人間の双方がセッションを跨いで同じ品質で作業するための正典。要約や別文書への転載はせず、変更はこのファイルへ行う。

## 1. 作業の選び方

1. [GitHub Project 4](https://github.com/users/9uiLe/projects/4) を Phase 順(0→7)に見る。
2. `Status: Todo` かつ Dependencies が解決済みの最小番号 Issue を選ぶ。

```bash
gh project item-list 4 --owner 9uiLe --format json --limit 100   # 全体
gh issue view <N> --repo 9uiLe/tenetr                            # 詳細
```

3. `Agent readiness` フィールドを尊重する:
   - `Ready for agent` — そのまま着手してよい。
   - `Needs decision` — 着手前に未確定点を decision-council で検討し ADR を作る。
   - `Human-only` — Agent は既定候補(Issue 本文に記載)に基づく Decision Record 草案までを作り、採用判断はユーザーへ明示的に確認する。

## 2. 実装ループ

1. ブランチ: `feat/issue-<番号>-<slug>`(Issue に紐付かない整備は `chore/<slug>`)。
2. Issue 本文の Deliverable / Verification / Out of scope を作業前に読み、Out of scope へ踏み出さない。
3. テストから書く(test = What)。`pnpm check` が毎コミットの正規入口。
4. コミットは `Why:` セクション必須(`AGENTS.md` Intent Placement 参照)。

## 3. 完了条件と証拠

- Issue の Verification チェックリストが唯一の完了条件。
- 各チェック項目に対応する証拠(コマンド出力、生成ファイルパス、スクリーンショット)を PR 本文へ記載する。
- 検証されていない項目を完了と報告しない。Fail や未解決項目は隠さず PR 本文の「残項目」へ書く。

## 4. PR

- 1 Issue = 1 PR。本文テンプレート:

```markdown
Closes #<N>

## What
<変更の要約>

## Verification
- [x] <Issue のチェック項目> — <証拠>

## 残項目 / 判断が必要なこと
<なければ「なし」>
```

- PR 作成前にメタ認知レビューを行う: 差分全体を俯瞰し、(a) 設計指示書との整合、(b) Out of scope 侵犯、(c) 単一 PR として理解可能か、を自問し、結果を PR 本文へ一行で残す。

## 5. Decision Record (ADR)

`docs/adr/NNNN-slug.md`。次の変更は実装 PR と分離して ADR を先に作る:

- Philosophy Pack の原則・事例・severity の変更
- Evaluator の削除・severity 引き下げ
- アーキテクチャ・技術スタックの選定と変更

テンプレート:

```markdown
# NNNN: <決定の一行要約>

- Date: YYYY-MM-DD
- Status: proposed | accepted | superseded by NNNN
- Issue: #<N>

## Context
<制約と背景>

## Decision
<採用した選択>

## Alternatives & dissent
<検討した代替案と、不採用にした理由。decision-council の反対意見はここへ残す>

## Consequences
<この決定で固定されるもの、再検討のトリガー>
```

## 6. decision-council の使い方

帰結の大きい選択(アーキテクチャ、評価設計、外部送信データ、Pack 内容)は、単独 Agent の判断バイアスを避けるため decision-council(Fable / Codex の独立助言 + 構造化反論)にかける。合意・反対の双方を ADR の Alternatives & dissent へ転記する。軽微なレビューは second-opinion で足りる。

## 7. 知見の結晶化

同じ手順・同じ説明を 2 回繰り返したら、`.claude/skills/<name>/SKILL.md`(手順)または `docs/`(知識)への結晶化を検討する。チャット履歴は正典にしない。
