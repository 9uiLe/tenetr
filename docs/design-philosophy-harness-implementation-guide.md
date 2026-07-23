# Design Philosophy Harness 実装指示書

## 0. 文書情報

- 文書名: Design Philosophy Harness 実装指示書
- 想定読者: AI Agent、実装担当エンジニア、デザイナー、テックリード
- 目的: プロダクト固有のデザイン哲学を、AI Agentの設計・実装・評価プロセスへ再利用可能かつ再現可能な形で組み込む
- 初期対象: iOSアプリの既存画面改善
- 実装方針: 小さく動くMVPを先に作り、評価データを蓄積しながら拡張する

---

## 1. ミッション

AI Agentが、一般的に「それっぽい」UIを生成するのではなく、対象プロダクト固有のデザイン哲学、過去の意思決定、採用例・却下例を参照して設計・実装できる仕組みを構築する。

本システムは、AIへ長いプロンプトを与えるだけの仕組みではない。以下を一貫した実行フローとして提供する。

1. タスクを解釈する
2. 適用すべきデザイン原則を特定する
3. 実装前にデザイン意図を明文化する
4. Agentが意図に沿って実装する
5. 実装結果を実機またはシミュレータから取得する
6. 決定的評価・モデル評価・人間評価に分類して検証する
7. 証拠付きレポートを生成する
8. 合格、修正、人間判断のいずれかへ分岐する
9. 実行条件と判断結果を保存し、後から再現できるようにする

---

## 2. 解決する課題

### 2.1 現状の問題

AI Agentへ次のような指示を与えるだけでは、プロダクト固有の品質を安定して再現できない。

- シンプルにする
- ブランドらしくする
- 洗練された画面にする
- デザインシステムを守る
- 既存画面に合わせる

これらは解釈の幅が広く、Agentは不足している判断材料を一般的なUIパターンで埋める。その結果、次の問題が発生する。

- 見た目は整っているが、プロダクトらしくない
- 既存のデザイン判断と矛盾する
- 主操作が不明確になる
- AI特有の過剰な装飾が入る
- 毎回異なる基準で自己評価する
- 修正理由が記録されず、次回に再利用されない
- 人間が毎回ゼロからレビューし直す

### 2.2 本システムが目指す状態

- デザイン哲学が機械可読な形式で管理されている
- タスクごとに適用原則が明示される
- Agentが実装前に意図と未解決事項を提示する
- 実装結果が原則単位で評価される
- 評価には観測事実と証拠が付属する
- AIが決めてよいことと、人間に戻すべきことが区別される
- 同じ入力と評価条件を後から再構成できる
- Claude Code、Codex、CIなど複数の実行環境から同じHarnessを利用できる

---

## 3. 基本原則

### 3.1 正本はSkillではなくPhilosophy Packとする

SkillはAgentへ作業手順を教えるアダプターであり、デザイン哲学の正本にはしない。

- Philosophy Pack: 何を良いとするか
- Harness Engine: どう検証するか
- Agent Skill: Agentがどの順番で作業するか
- CI Workflow: いつ強制するか
- MCP Adapter: 外部コンテキストへどうアクセスするか

### 3.2 共通部分とプロダクト固有部分を分離する

共通化するもの:

- スキーマ
- CLI
- 評価エンジン
- レポート形式
- Agentの作業フロー
- CI統合
- 実行記録

プロダクト固有にするもの:

- デザイン原則
- 原則の優先順位
- 採用例・却下例
- ブランド上の禁止事項
- デザイントークン
- 画面シナリオ
- 意思決定記録
- 合格基準

### 3.3 自動判定できないものを無理に自動判定しない

評価は次の3種類へ必ず分類する。

1. Deterministic: コードで一意に判定できる
2. Model-based: 視覚的・意味的判断をAIモデルで支援する
3. Human-only: 新しい方向性や原則の衝突など、人間が決定する

モデル評価のみを根拠にマージを自動停止してはならない。MVPでは、モデル評価は原則としてWarnまたはHuman Reviewとする。

### 3.4 点数ではなく証拠を返す

単一の総合点だけを返してはならない。評価結果には最低限、以下を含める。

- 対象原則
- Pass / Warn / Fail / Human Review
- 観測事実
- 判断
- 証拠となる画像またはコード位置
- 確信度
- 推奨修正
- 使用した評価器とバージョン

### 3.5 不明点を平均的なUIで埋めない

必要な情報が不足している場合、Agentは推測で進めず、`blocking_questions` または `human_review_items` として明示する。

ただし、実装全体を止める必要がない不明点は、仮定を明記したうえで進めてよい。

---

## 4. MVPの対象範囲

### 4.1 対象

iOSアプリの既存画面を改善するタスク。

例:

- 結果画面の主操作を明確にする
- オンボーディングの情報量を減らす
- 既存画面をデザイン哲学に沿って再構成する
- AIが生成したSwiftUI画面を評価する

### 4.2 MVPで実装する機能

- Philosophy Packの読み込みと構文検証
- タスクから適用原則を抽出する
- Design Intent Contractを生成する
- SwiftUI実装後のスクリーンショット取得
- 決定的評価の実行
- 画像とルーブリックを用いたモデル評価
- HTMLおよびJSONレポート生成
- Run Manifest保存
- Agent SkillからCLIを呼び出す
- GitHub Actionsで結果をArtifactsへ保存する

### 4.3 MVPでは実装しないもの

- Figmaの完全同期
- 自動デザイン生成ツール
- すべてのデザイン品質を一つの点数に集約する仕組み
- モデル評価だけによる自動マージ拒否
- ユーザー行動データとの自動連携
- 全画面・全状態の網羅
- デザイン哲学そのものの自動生成
- 複数プロダクトを横断した自動最適化

---

## 5. 利用者から見た基本フロー

```text
人間がタスクを渡す
        ↓
Harnessがタスクを分類する
        ↓
Philosophy Packから適用原則と事例を抽出する
        ↓
Design Intent Contractを生成する
        ↓
AgentがContractに沿って実装する
        ↓
シミュレータまたは実機で対象状態を再現する
        ↓
スクリーンショット・コード情報・環境情報を取得する
        ↓
決定的評価・モデル評価を実行する
        ↓
証拠付きレポートを生成する
        ↓
Pass / Fix / Human Review
```

### 5.1 人間が入力するもの

最低限、自然言語のタスクだけで開始できるようにする。

例:

```text
パズル完了後の結果画面をすっきりさせて、
ユーザーが次に進む操作を迷わないようにしてください。
```

必要に応じて次の構造化入力も受け付ける。

```yaml
task:
  id: improve-result-screen
  title: 結果画面の主操作を明確にする
  description: >
    パズル完了後の結果画面をすっきりさせ、
    ユーザーが次に進む操作を迷わないようにする。
  target:
    platform: ios
    screen: ResultScreen
  constraints:
    - 既存のスコア表示は維持する
    - シェア機能を削除しない
  success_signals:
    - 次へ進む操作が一目で分かる
```

### 5.2 Agentが実装前に出力するもの

Agentはコード変更前にDesign Intent Contractを生成する。

```yaml
design_intent:
  task_id: improve-result-screen

  primary_goal:
    ユーザーが次に進む操作を1タップで認識できる状態にする

  applicable_principles:
    - focus.single-primary-decision
    - information.progressive-disclosure
    - expression.no-artificial-excitement
    - consistency.use-established-components

  primary_action:
    id: next
    treatment: primary

  secondary_actions:
    - id: share
      treatment: secondary

  information_to_show:
    - clear_state
    - score
    - stars
    - next_action

  information_to_deemphasize:
    - best_score
    - share

  prohibited_patterns:
    - 複数の同等な主ボタン
    - 過剰なグロー
    - 紙吹雪などの広告的演出
    - 原則と無関係な装飾

  unresolved_items:
    - id: share-placement
      severity: non_blocking
      question: シェアを画面内に常時表示する必要があるか
      assumption: MVPではセカンダリボタンとして残す

  acceptance_conditions:
    - 主ボタンは1つ
    - 主ボタンとシェアの視覚的重要度が異なる
    - 必須情報が一画面に収まる
```

### 5.3 評価後に人間が見るもの

HTMLレポートには次を表示する。

- タスク概要
- 適用されたデザイン原則
- Design Intent Contract
- Before / After画像
- 原則ごとの判定
- 観測事実
- 問題箇所の画像領域
- 修正提案
- 人間判断が必要な項目
- 実行環境
- 使用したPack、Harness、Rubric、モデルのバージョン

---

## 6. システム構成

```text
┌──────────────────────────────────────────┐
│ Product Repository                       │
│                                          │
│ design-philosophy/                       │
│ ├── pack.yaml                            │
│ ├── principles.yaml                      │
│ ├── tradeoffs.yaml                       │
│ ├── anti-patterns.yaml                   │
│ ├── rubrics.yaml                         │
│ ├── tokens/                              │
│ ├── exemplars/                           │
│ ├── decisions/                           │
│ └── scenarios/                           │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ Design Philosophy Harness                │
│                                          │
│ ├── Schema Validator                     │
│ ├── Context Resolver                     │
│ ├── Intent Compiler                      │
│ ├── Artifact Collector                   │
│ ├── Deterministic Evaluators             │
│ ├── Model Evaluators                     │
│ ├── Report Generator                     │
│ └── CLI                                  │
└───────────────┬───────────────┬──────────┘
                │               │
        ┌───────▼──────┐ ┌──────▼─────────┐
        │ Agent Skill  │ │ CI Workflow    │
        └──────────────┘ └────────────────┘
```

---

## 7. 推奨リポジトリ構成

MVPではMonorepoを推奨する。仕様が安定した後にパッケージを分離する。

```text
design-philosophy-harness/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   ├── spec/
│   │   ├── schemas/
│   │   │   ├── philosophy-pack.schema.json
│   │   │   ├── design-intent.schema.json
│   │   │   ├── evaluation.schema.json
│   │   │   └── run-manifest.schema.json
│   │   └── src/
│   ├── core/
│   │   └── src/
│   │       ├── load-pack/
│   │       ├── resolve-context/
│   │       ├── compile-intent/
│   │       ├── evaluate/
│   │       └── manifest/
│   ├── evaluators/
│   │   └── src/
│   │       ├── deterministic/
│   │       ├── model/
│   │       └── human-review/
│   ├── reporters/
│   │   └── src/
│   │       ├── json/
│   │       └── html/
│   ├── cli/
│   │   └── src/
│   └── ios-adapter/
│       └── src/
├── skills/
│   ├── agent-skills/
│   │   └── design-philosophy-compliance/
│   │       ├── SKILL.md
│   │       ├── scripts/
│   │       └── references/
│   ├── claude-code/
│   └── codex/
├── examples/
│   └── num-path/
│       ├── design-philosophy/
│       ├── task.yaml
│       └── expected/
├── .github/
│   └── workflows/
│       ├── reusable-design-review.yml
│       └── ci.yml
└── docs/
    ├── architecture.md
    ├── authoring-philosophy-pack.md
    └── evaluator-development.md
```

### 7.1 実装言語

参照実装はTypeScriptを推奨する。

理由:

- CLIを作りやすい
- JSON Schemaとの親和性が高い
- macOSおよびCIで動かしやすい
- Agentから呼び出しやすい
- HTMLレポート生成と統合しやすい
- 将来的にMCPサーバーへ展開しやすい

SwiftはiOS固有の成果物取得やコード解析用アダプターに限定する。Harnessの中核をSwift専用にしない。

---

## 8. Philosophy Pack仕様

### 8.1 pack.yaml

```yaml
schema_version: "1.0"

product:
  id: num-path
  name: Num Path
  philosophy_version: "0.1.0"

files:
  principles: principles.yaml
  tradeoffs: tradeoffs.yaml
  anti_patterns: anti-patterns.yaml
  rubrics: rubrics.yaml
  exemplars: exemplars/index.yaml
  scenarios: scenarios/index.yaml
  decisions: decisions/index.yaml
  tokens: tokens/tokens.json

defaults:
  locale: ja-JP
  platform: ios

gating:
  deterministic_fail_blocks: true
  model_fail_blocks: false
  unresolved_blocking_questions_block: true
```

### 8.2 principles.yaml

各原則は次を持つ。

```yaml
principles:
  - id: focus.single-primary-decision

    statement: >
      一度にユーザーが判断する主対象を1つに限定する。

    intent: >
      情報量そのものを減らすのではなく、
      判断対象の競合を減らす。

    priority: 90

    applies_when:
      any:
        - primary_action_exists
        - completion_screen
        - onboarding_step

    does_not_apply_when:
      any:
        - explicit_comparison_task

    conflicts_with:
      - information.complete-at-first-view

    tie_breaker: >
      後から取得可能な情報であれば、
      初期表示の判断の明確さを優先する。

    positive_examples:
      - result-screen-v3

    negative_examples:
      - result-screen-v1

    observable_signals:
      - id: primary-control-count
        description: 主操作として知覚されるコントロール数
        expected: "<= 1"

      - id: visual-hierarchy-gap
        description: 主操作と副操作の視覚的重要度に差がある
        expected: true

    human_review_when:
      - 複数の操作が事業上同等に重要
      - 新しいナビゲーションモデルを導入する
```

### 8.3 anti-patterns.yaml

```yaml
anti_patterns:
  - id: expression.artificial-excitement
    name: 人工的な興奮演出
    description: >
      ユーザー価値と関係なく、グロー、紙吹雪、ネオン、
      強いグラデーションなどで達成感を誇張する。
    severity: warn
    examples:
      - result-screen-v1
    detection:
      deterministic: false
      model: true
```

### 8.4 tradeoffs.yaml

原則同士の衝突を明示する。

```yaml
tradeoffs:
  - id: clarity-vs-completeness
    principles:
      - focus.single-primary-decision
      - information.complete-at-first-view

    default_preference:
      principle: focus.single-primary-decision

    override_when:
      - 追加情報が意思決定に不可欠
      - 後から情報を取得できない

    human_review_when:
      - どちらも主要KPIへ直接影響する
```

### 8.5 exemplars/index.yaml

```yaml
exemplars:
  - id: result-screen-v3
    status: accepted
    artifact: accepted/result-screen-v3.png
    scenario: result-screen-completed
    principles:
      supports:
        - focus.single-primary-decision
        - consistency.use-established-components
    rationale: >
      次へボタンのみを主操作として扱い、
      シェアは副操作へ落としている。

  - id: result-screen-v1
    status: rejected
    artifact: rejected/result-screen-v1.png
    scenario: result-screen-completed
    principles:
      violates:
        - focus.single-primary-decision
        - expression.no-artificial-excitement
    rationale: >
      次へとシェアが同じ強さで表示され、
      背景演出が主操作より目立つ。
```

### 8.6 decisions

過去の判断をADRに近い形式で残す。

```yaml
id: decision-2026-001
date: 2026-07-23
status: accepted
context: >
  結果画面で次へとシェアを同じ強さで表示していた。
decision: >
  次へを唯一の主操作とし、
  シェアはアウトライン形式の副操作へ変更する。
principles:
  - focus.single-primary-decision
consequences:
  positive:
    - 次の操作が明確になる
  negative:
    - シェア機能の発見性が下がる可能性
review_when:
  - シェア率を主要KPIに変更した場合
```

---

## 9. Design Intent Contract仕様

### 9.1 目的

Agentが実装へ進む前に、何を守り、何を変え、何を保留するかを固定する。

### 9.2 必須フィールド

```yaml
design_intent:
  schema_version: "1.0"
  task_id: string
  generated_at: datetime

  target:
    platform: ios
    screen: string
    states: []

  primary_goal: string

  applicable_principles:
    - principle_id: string
      priority: number
      reason: string

  selected_exemplars:
    accepted: []
    rejected: []

  design_decisions:
    primary_action: {}
    secondary_actions: []
    information_hierarchy: []
    component_policy: []
    visual_expression: []

  prohibited_patterns: []

  assumptions:
    - id: string
      statement: string
      confidence: number

  unresolved_items:
    - id: string
      severity: blocking | non_blocking | human_review
      question: string
      current_assumption: string | null

  acceptance_conditions:
    - id: string
      type: deterministic | model | human
      statement: string
```

### 9.3 実装開始条件

次の条件を満たすまでAgentはコード変更へ進まない。

- Philosophy Packが有効
- 対象画面が特定されている
- 適用原則が1つ以上ある
- `blocking` の未解決事項がない
- 受け入れ条件が1つ以上ある

---

## 10. CLI仕様

CLI名は仮に `design-harness` とする。

### 10.1 初期化

```bash
design-harness init
```

生成物:

```text
design-philosophy/
├── pack.yaml
├── principles.yaml
├── tradeoffs.yaml
├── anti-patterns.yaml
├── rubrics.yaml
├── exemplars/
├── decisions/
└── scenarios/
```

### 10.2 Pack検証

```bash
design-harness validate \
  --pack ./design-philosophy
```

終了コード:

- `0`: 有効
- `1`: スキーマ違反
- `2`: 参照切れ
- `3`: 意味的矛盾
- `4`: 実行環境エラー

### 10.3 タスク解決

```bash
design-harness resolve \
  --pack ./design-philosophy \
  --task ./task.yaml \
  --out ./.design-harness/intent.json
```

処理内容:

1. タスク分類
2. 適用原則抽出
3. 事例検索
4. 原則衝突解決
5. 不足情報抽出
6. Design Intent Contract生成

### 10.4 成果物取得

```bash
design-harness capture \
  --scenario result-screen-completed \
  --platform ios \
  --out ./.design-harness/artifacts
```

MVPではiOS Simulatorを対象にする。

取得対象:

- スクリーンショット
- 端末情報
- OS
- Locale
- Appearance
- Dynamic Type
- 対象シナリオ
- Git commit
- 実行日時

### 10.5 評価

```bash
design-harness evaluate \
  --pack ./design-philosophy \
  --intent ./.design-harness/intent.json \
  --artifacts ./.design-harness/artifacts \
  --out ./.design-harness/evaluation.json
```

### 10.6 レポート生成

```bash
design-harness report \
  --evaluation ./.design-harness/evaluation.json \
  --manifest ./.design-harness/run-manifest.json \
  --format html \
  --out ./.design-harness/report.html
```

### 10.7 一括実行

```bash
design-harness run \
  --pack ./design-philosophy \
  --task ./task.yaml \
  --scenario result-screen-completed
```

一括実行は以下を順に行う。

```text
validate
→ resolve
→ capture
→ evaluate
→ report
```

---

## 11. Agent Skill仕様

### 11.1 Skillの責務

- Harnessの存在をAgentへ認識させる
- 正しいCLI順序で実行させる
- Design Intent Contractを実装時の制約として扱わせる
- FailやHuman Reviewを隠さず報告させる
- Philosophy Packを勝手に書き換えさせない

### 11.2 SKILL.mdの基本内容

```markdown
# Design Philosophy Compliance

## Goal

Implement UI changes while preserving the product's design philosophy.

## Required procedure

1. Read the user task.
2. Run `design-harness validate`.
3. Run `design-harness resolve`.
4. Read the generated Design Intent Contract.
5. Do not modify implementation while blocking questions remain.
6. Implement only within the declared intent and constraints.
7. Run the target scenario and capture artifacts.
8. Run `design-harness evaluate`.
9. Fix deterministic failures.
10. Do not silently override model warnings or human-review items.
11. Generate and report the final HTML and JSON results.

## Prohibited behavior

- Do not invent new design principles.
- Do not edit accepted or rejected exemplars to make the implementation pass.
- Do not remove evaluators.
- Do not lower severity without an explicit decision record.
- Do not describe a warning as a pass.
```

### 11.3 Agentの最終報告形式

```text
実装内容
- 変更した画面
- 主な変更点

適用したデザイン原則
- 原則ID
- 実装への反映方法

評価結果
- Deterministic: Pass / Fail
- Model-based: Pass / Warn
- Human Review: 件数

未解決事項
- 人間判断が必要な内容

成果物
- report.html
- evaluation.json
- run-manifest.json
```

---

## 12. 評価エンジン

### 12.1 共通インターフェース

```ts
export interface Evaluator {
  id: string;
  version: string;
  kind: "deterministic" | "model" | "human";
  evaluate(context: EvaluationContext): Promise<EvaluationFinding[]>;
}
```

```ts
export interface EvaluationFinding {
  id: string;
  evaluatorId: string;
  principleId?: string;
  severity: "info" | "warn" | "fail" | "human_review";
  verdict: "pass" | "warn" | "fail" | "unknown";
  confidence?: number;

  observations: Observation[];
  judgment: string;
  remediation?: string;

  evidence: Evidence[];
}
```

### 12.2 Deterministic Evaluators

MVP候補:

- Philosophy Pack構文検証
- 参照IDの整合性
- 必須シナリオの画像有無
- スクリーンショットサイズ
- 禁止された色・トークンのハードコード
- SwiftUIコンポーネント利用規約
- タップ領域
- アクセシビリティラベル
- Dynamic Typeでの欠落
- ライト・ダークモードの取得有無
- 主操作数に関するUIメタデータ

注意:

画像だけからタップ領域やAccessibilityを推定しない。XCTest、Accessibility Tree、SwiftUI Inspection用の補助データを利用する。

### 12.3 Model-based Evaluators

MVP候補:

- 主操作が一意に認識できるか
- 情報の視覚的階層がDesign Intentと一致するか
- 採用例の原則を踏襲しているか
- 却下例と同じ失敗を再発していないか
- AI特有の過剰装飾がないか
- プロダクトらしさを損なう表現がないか

モデル評価入力:

- Design Intent Contract
- 対象原則
- 原則の目的
- 採用例
- 却下例
- 実装後画像
- 必要に応じてBefore画像
- 評価ルーブリック

モデル評価出力はJSON Schemaで強制する。

### 12.4 Human Review Evaluators

次の場合は自動判定せずHuman Reviewを作る。

- 新しいブランド表現
- 原則同士の未定義な衝突
- 過去の却下例を意図的に採用
- 情報構造そのものの変更
- 新しいナビゲーション
- 事業KPIとのトレードオフ
- 評価モデル間で判定が分かれる
- 確信度が閾値未満

---

## 13. 判定ルール

### 13.1 Verdict

- `pass`: 原則を満たす
- `warn`: 問題の可能性があるが、自動停止しない
- `fail`: 決定的な違反
- `unknown`: 情報不足
- `human_review`: 人間判断が必要

### 13.2 MVPのゲート

```text
Deterministic Fail
→ CI失敗

Blocking Question
→ 実装開始またはCIを停止

Model Warn
→ CI成功。ただしレポートへ強調表示

Model Fail
→ MVPではWarn相当として扱う
→ 将来、評価精度が実証された項目のみゲートへ昇格

Human Review
→ CI成功
→ PRにレビュー必須ラベルまたはコメントを付与
```

### 13.3 総合点

総合点は参考表示に限定する。マージ条件には使用しない。

表示する場合:

- 原則別スコア
- DeterministicとModelを別表示
- 評価不能項目を除外せず明示
- 重みはPack側でバージョン管理

---

## 14. 評価結果JSON

```json
{
  "schema_version": "1.0",
  "run_id": "run-2026-07-23-001",
  "summary": {
    "verdict": "warn",
    "deterministic": {
      "pass": 8,
      "fail": 0
    },
    "model": {
      "pass": 3,
      "warn": 1
    },
    "human_review": 1
  },
  "findings": [
    {
      "id": "finding-001",
      "evaluator_id": "visual-primary-action",
      "principle_id": "focus.single-primary-decision",
      "severity": "warn",
      "verdict": "warn",
      "confidence": 0.84,
      "observations": [
        {
          "type": "visual",
          "fact": "次へボタンとシェアボタンの幅が同じである"
        }
      ],
      "judgment": "副操作の視覚的重要度がまだ高い",
      "remediation": "シェアボタンの幅、塗り、配置のいずれかを弱める",
      "evidence": [
        {
          "type": "image_region",
          "artifact": "result-screen.png",
          "region": {
            "x": 0.08,
            "y": 0.72,
            "width": 0.84,
            "height": 0.18
          }
        }
      ]
    }
  ]
}
```

---

## 15. Run Manifest

### 15.1 目的

完全に同じモデル出力を保証するのではなく、同じ入力・評価条件・証拠を再構成できる状態を保証する。

### 15.2 保存内容

```yaml
run_id: run-2026-07-23-001
started_at: "2026-07-23T18:45:00+09:00"
completed_at: "2026-07-23T18:48:12+09:00"

versions:
  philosophy_pack: "0.1.0"
  philosophy_pack_sha256: "..."
  harness: "0.1.0"
  skill: "0.1.0"
  rubric: "0.1.0"

source:
  repository: "..."
  commit: "..."
  dirty: false

task:
  file: task.yaml
  sha256: "..."

intent:
  file: intent.json
  sha256: "..."

models:
  intent_resolver:
    provider: "..."
    model: "..."
    prompt_sha256: "..."
    temperature: 0

  visual_evaluator:
    provider: "..."
    model: "..."
    prompt_sha256: "..."
    temperature: 0
    repetitions: 1

environment:
  platform: ios
  device: "iPhone Simulator"
  os: "..."
  locale: "ja-JP"
  appearance: "light"
  content_size_category: "large"

artifacts:
  - path: artifacts/result-screen.png
    sha256: "..."

evaluation:
  file: evaluation.json
  sha256: "..."
```

### 15.3 再評価

次をサポートする。

```bash
design-harness replay \
  --manifest ./.design-harness/run-manifest.json
```

`replay` は保存済み成果物を使い、評価のみ再実行する。アプリの再ビルドはしない。

---

## 16. iOSアダプター

### 16.1 MVPの取得方法

XCUITestまたは専用UITest Targetから対象状態を再現し、スクリーンショットを保存する。

シナリオ例:

```yaml
scenarios:
  - id: result-screen-completed
    test_target: NumPathUITests
    test_case: ResultScreenSnapshotTests/testCompleted
    required_artifacts:
      - screenshot
      - accessibility_tree
    environments:
      - locale: ja-JP
        appearance: light
        content_size_category: large
```

### 16.2 テストデータ

結果画面などの状態を安定して再現するため、アプリへテスト用Launch ArgumentまたはDeep Linkを追加する。

例:

```text
-numPathScenario result-screen-completed
-score 830
-stars 3
-bestScore 920
```

テストデータは本番処理から分離し、DebugまたはUITestビルドのみで有効にする。

### 16.3 取得する補助データ

可能な範囲で以下をJSON保存する。

- Accessibility Tree
- UI要素のframe
- role
- label
- identifier
- enabled
- hittable
- selected
- ボタン階層
- 画面サイズ

これにより、画像だけでは判定できない項目を決定的評価へ移せる。

---

## 17. HTMLレポート

### 17.1 必須セクション

1. Run Summary
2. Task
3. Design Intent
4. Before / After
5. Applicable Principles
6. Deterministic Findings
7. Model Findings
8. Human Review Items
9. Evidence
10. Reproduction Information
11. Artifact Links

### 17.2 表示原則

- Passは簡潔に表示
- Warn / Fail / Human Reviewを優先表示
- 問題箇所を画像上の矩形で示す
- 観測事実と判断を別欄にする
- 確信度を表示する
- 修正提案は原則と結びつける
- モデルの自由文をそのまま大量表示しない
- Pack、Rubric、Evaluatorのバージョンを表示する

---

## 18. GitHub Actions

### 18.1 実行タイミング

MVPでは次の場合に実行する。

- `design-philosophy/**` の変更
- 対象SwiftUI画面の変更
- UI Testシナリオの変更
- 手動実行

### 18.2 Workflow

```text
checkout
→ dependencies
→ design-harness validate
→ build for testing
→ run snapshot scenario
→ collect artifacts
→ design-harness evaluate
→ design-harness report
→ upload artifacts
→ PR summary
```

### 18.3 PRへ表示する内容

```text
Design Philosophy Review

Verdict: WARN

Deterministic
- 8 Pass
- 0 Fail

Model
- 3 Pass
- 1 Warn

Human Review
- 1 item

Report
- report.html artifact
```

### 18.4 キャッシュ

- Node dependencies
- Swift Package Manager
- DerivedDataは安全に再利用できる範囲のみ
- モデル評価結果は入力ハッシュが完全一致する場合のみ再利用

---

## 19. テスト戦略

### 19.1 Unit Tests

- YAML / JSON読み込み
- Schema validation
- 原則フィルタ
- 優先順位
- Tradeoff解決
- Contract生成
- Finding集約
- Gate判定
- Manifestハッシュ
- レポートデータ変換

### 19.2 Contract Tests

- CLIの入出力
- JSON Schema互換性
- Evaluator Plugin Interface
- Agent Skillから呼び出すコマンド
- CI Workflowの出力ファイル

### 19.3 Golden Tests

入力PackとTaskに対して、次の出力を固定する。

- 適用原則
- Design Intent Contract
- Deterministic Findings
- HTMLレポートの主要構造

モデル生成文の完全一致はGolden Testにしない。JSON構造、原則ID、証拠の有無、判定カテゴリを検証する。

### 19.4 Evaluator Validation

モデル評価器を導入する前に、デザイナーまたは担当者がラベルした事例セットを作る。

最低限:

- 明確なPass
- 明確なFail
- 境界事例
- 原則衝突
- 情報不足
- AI-Slop的な装飾
- 一見良いがプロダクト哲学に反する例

測定するもの:

- 人間判定との一致率
- Failの見逃し
- 誤検知
- 判定の揺れ
- 証拠位置の妥当性

---

## 20. セキュリティと運用

### 20.1 外部モデルへ送信するデータ

送信前に以下を制御する。

- 個人情報を含む画面
- 社内機密
- 未公開機能
- ユーザーデータ
- APIキー
- デバッグログ

必要に応じて画像マスキングを行う。

### 20.2 Pack改ざん防止

Agentは評価を通す目的で以下を変更してはならない。

- 原則のseverity
- accepted / rejectedの状態
- Rubric
- Evaluator設定
- Gate設定

これらの変更は別PRとして扱い、Decision Recordを必須にする。

### 20.3 監査可能性

以下の変更履歴をGitで追跡する。

- 原則
- 優先順位
- 事例
- 判断理由
- Rubric
- Gate
- 評価器
- Skill

---

## 21. 実装フェーズ

## Phase 0: サンプルの準備

目的: 評価したい対象を明確にする。

作業:

- 対象画面を1つ選ぶ
- 改善タスクを1つ定義する
- 原則を5個以内で定義する
- 採用例を3件以上用意する
- 却下例を3件以上用意する
- UI Testで対象状態を固定する
- 人間が期待する判定を書き出す

完了条件:

- Before画像がある
- 期待するAfterの方向性が説明できる
- 何をFailとするかが決まっている

## Phase 1: SpecとCLI基盤

作業:

- Monorepo作成
- 4種類のJSON Schema作成
- Pack Loader
- Validator
- `init`
- `validate`
- `resolve`
- 基本テスト

完了条件:

- 不正なPackを検出できる
- タスクから適用原則を出力できる
- Design Intent ContractをJSONで生成できる

## Phase 2: iOS Artifact Capture

作業:

- XCUITestシナリオ作成
- Launch ArgumentまたはDeep Link追加
- スクリーンショット保存
- Accessibility Tree保存
- `capture`
- 環境情報保存

完了条件:

- 同一条件で対象画面を再取得できる
- CIでも画像を取得できる
- Artifactにハッシュが付く

## Phase 3: Deterministic Evaluation

作業:

- 必須Artifact検査
- UI要素メタデータ検査
- 主要なAccessibility検査
- 原則単位のFinding
- Gate判定
- `evaluate`

完了条件:

- 明確な違反でCIを失敗させられる
- すべてのFailに証拠がある
- 同じ入力では同じ結果になる

## Phase 4: Model Evaluation

作業:

- モデル入力Builder
- Structured Output
- 視覚階層Evaluator
- Anti-pattern Evaluator
- Exemplars比較
- Confidence
- Human Review分岐

完了条件:

- 人間ラベル済み事例で評価する
- 判定不能をUnknownとして返せる
- モデル自由文ではなくSchema準拠JSONを返す
- モデル評価はCIを直接Failさせない

## Phase 5: HTML Report

作業:

- Before / After
- 原則一覧
- Findings
- 画像領域表示
- Run Manifest
- Artifactリンク
- `report`

完了条件:

- デザイナーがCLIを見ずに判断できる
- Agentの説明がなくても問題箇所を理解できる

## Phase 6: Agent Skill

作業:

- Agent Skills互換Skill
- Claude Code Adapter
- Codex Adapter
- サンプルタスク
- End-to-Endテスト

完了条件:

- Agentが手順を飛ばさない
- Intent作成前に実装しない
- Failを修正する
- Human Reviewを隠さない

## Phase 7: GitHub Actions

作業:

- Reusable Workflow
- Artifact Upload
- PR Summary
- 対象ファイルフィルタ
- 手動実行

完了条件:

- PRからレポートへ到達できる
- Deterministic FailでCIが落ちる
- WarnではCIは通る
- 実行結果が保存される

---

## 22. MVP受け入れ条件

### 22.1 機能

- [ ] Philosophy Packを読み込める
- [ ] スキーマエラーを具体的に表示できる
- [ ] タスクから適用原則を抽出できる
- [ ] Design Intent Contractを生成できる
- [ ] iOS画面を同一条件で取得できる
- [ ] Deterministic評価を実行できる
- [ ] Model評価を実行できる
- [ ] Human Reviewへ分岐できる
- [ ] JSONレポートを生成できる
- [ ] HTMLレポートを生成できる
- [ ] Run Manifestを保存できる
- [ ] Agent Skillから一連の処理を実行できる
- [ ] GitHub ActionsでArtifactを保存できる

### 22.2 品質

- [ ] Failには必ず証拠がある
- [ ] 判断と観測事実が分離されている
- [ ] 同じ決定的入力は同じ判定になる
- [ ] モデル情報とPrompt Hashが保存される
- [ ] 不明点をUnknownまたはHuman Reviewとして返せる
- [ ] AgentがPackを書き換えて評価を回避できない
- [ ] レポートだけで修正方針が理解できる

### 22.3 運用

- [ ] Philosophy Pack変更時にDecision Recordが必要
- [ ] Rubric変更がバージョン管理される
- [ ] 評価器ごとのVersionが保存される
- [ ] 過去Runをreplayできる
- [ ] モデル評価をオフにしても決定的評価が動く

---

## 23. 最初の検証シナリオ

### 23.1 タスク

```text
パズル完了後の結果画面をすっきりさせ、
ユーザーが次に進む操作を迷わないようにする。
スコア、星、次へ、シェアは残す。
```

### 23.2 原則

1. 主判断を1つに限定する
2. 情報は必要最小限にする
3. 人工的な興奮演出を避ける
4. 一貫したコンポーネントを利用する
5. ブランドらしさは操作性を妨げない範囲で表現する

### 23.3 Deterministic評価

- 必須要素が存在する
- Primary Actionが1つ
- PrimaryとSecondaryでstyleが異なる
- Accessibility Labelが存在する
- タップ領域が基準を満たす
- スクリーンショットが取得されている

### 23.4 Model評価

- 次へが最初に目に入る
- シェアが次へと競合していない
- 背景装飾が情報より強くない
- 却下例と同じ広告的演出がない
- 採用例の情報階層を踏襲している

### 23.5 Human Review

- 星の演出がプロダクトらしいか
- シェアの発見性低下を許容できるか
- ブランド表現をさらに強くすべきか

---

## 24. 実装時の禁止事項

- 最初から汎用デザイン評価プラットフォームを作らない
- 原則を大量に定義しない
- モデル評価を絶対的な正解として扱わない
- 総合点だけで合否を決めない
- スクリーンショットだけですべてを判定しない
- 採用例だけを保存しない
- 判断理由なしに却下例を保存しない
- Skillへ全ロジックを埋め込まない
- MCPをMVPの必須要件にしない
- Philosophy Packを自動生成して正本化しない
- 評価を通すためにRubricを緩めない
- 人間判断が必要な項目をAgentに決定させない

---

## 25. 完成の定義

本システムは、単にCLIが動いた時点では完成としない。

以下が成立した状態をMVP完成とする。

1. 人間が自然言語で画面改善タスクを入力できる
2. Harnessが適用原則と事例を選べる
3. AgentがDesign Intent Contractに沿って実装できる
4. 対象画面を再現可能な条件で取得できる
5. 明確な違反を決定的に検出できる
6. 曖昧な品質をモデル評価で補助できる
7. 自動判定できない内容を人間へ戻せる
8. すべての判断に証拠とバージョン情報がある
9. 後から同じ成果物を再評価できる
10. Agentを変更してもPhilosophy Packと評価結果を再利用できる

---

## 26. AI Agentへ渡す実装開始プロンプト

以下を、そのまま実装Agentへ渡せる初期プロンプトとして利用する。

```text
あなたはDesign Philosophy HarnessのMVPを実装します。

目的は、iOSアプリの既存画面改善において、プロダクト固有のデザイン哲学を
AI Agentの設計・実装・評価プロセスへ再利用可能かつ再現可能な形で組み込むことです。

最初から全機能を作らず、本指示書のPhase順に実装してください。
現在のPhaseより先の抽象化を行わないでください。

必須ルール:
- Philosophy Packを正本とする
- Skillに哲学や評価ロジックを埋め込まない
- 決定的評価、モデル評価、人間評価を分離する
- モデル評価のみでCIを失敗させない
- すべてのFailへ証拠を付与する
- 観測事実と判断を分離する
- 不足情報は推測で埋めず、UnknownまたはHuman Reviewへ送る
- Run Manifestへ入力、環境、モデル、Prompt、成果物のハッシュを保存する
- MVP対象はiOSの1画面、1シナリオに限定する

作業開始時:
1. 本指示書を読み、実装対象と非対象を整理する
2. 不明点をBlocking / Non-blockingに分類する
3. Phase 0に必要な成果物を確認する
4. リポジトリ構成案と最初の小さなPR単位を提示する
5. 受け入れ条件に対応するテスト計画を作る
6. その後に実装を開始する

各PRでは以下を報告してください:
- 対応Phase
- 実装した責務
- 追加したテスト
- 受け入れ条件との対応
- 未解決事項
- 次のPRで扱う内容
```
