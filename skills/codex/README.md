# Codex から design-harness を使う

1. `AGENTS-snippet.md` の内容を利用側リポジトリの AGENTS.md へ追記する。
2. CLI はビルド済みなら `node packages/cli/dist/bin.js`、または同梱ラッパー
   `skills/agent-skills/design-philosophy-compliance/scripts/design-harness.sh` を使う。
3. Pack・intent・evaluation・report は全てファイルであり、Agent 実装 (Claude Code / Codex) に
   依存しない。Agent を切り替えても同じ Pack と評価結果をそのまま再利用できる。
