# Philosophy Pack ガバナンス (§20.2-20.3, Issue #28)

## 機械的強制 (CI)

- `scripts/check-pack-governance.mjs` が PR ごとに検査する:
  1. `design-philosophy/` 配下の変更には `docs/adr/NNNN-*.md` の追加/更新が同一 PR に必要。
  2. 原則・anti-pattern・rubric・期待判定の変更には `pack.yaml` の `philosophy_version` 更新が必要。
- master は branch protection(PR 必須 + required check + 管理者にも適用)で保護されており、CI を通らない Pack 変更はマージできない。Agent が評価を通すために Pack を書き換える経路は、Decision Record の作成を伴わない限り機械的に遮断される。

## 監査手順

- Pack の変更履歴: `git log --follow -- <pack file>` で全変更と対応コミット(Why 付き)を追跡できる。
- 各変更の判断根拠: 同一 PR の `docs/adr/` を参照する(CI が対応を強制)。
- Run との対応: `run-manifest.json` の `versions.philosophy_pack_sha256` が評価時点の Pack 全体ハッシュを保持し、`git log` 上のコミットと突き合わせられる。
- 評価器のバージョン: `versions.harness` と evaluator id が evaluation.json に記録される。

## 例外

- 緊急の修正でも `--no-verify` や検査の無効化で回避しない(AGENTS.md)。ガバナンス検査自体の変更は ADR 必須。
