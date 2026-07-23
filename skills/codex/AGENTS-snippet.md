# Codex adapter — AGENTS.md 追記用スニペット

利用側リポジトリの AGENTS.md へ以下を追記する (Codex は AGENTS.md を正典として読む):

```markdown
## Design Philosophy Compliance

UI 画面を変更するタスクでは、必ず skills/agent-skills/design-philosophy-compliance/SKILL.md
の Required steps に従うこと。要点:

1. `design-harness validate` が exit 0 になるまで実装を開始しない。
2. `design-harness resolve` の Design Intent Contract (ready_to_implement / ready_blockers) に従う。
3. 実装後は capture → evaluate を実行し、Deterministic fail を修正するまで完了報告しない。
4. warn / human_review を隠さず、§11.3 の報告形式で結果を返す。
5. Philosophy Pack (原則・事例・severity) を実装が通るように書き換えない。変更は Decision Record 必須。
```
