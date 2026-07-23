import type {
  DeterministicEvaluator,
  EvaluationContext,
  Finding,
  FlatElement,
} from "../context.js";
import { flattenElements } from "../context.js";

const region = (element: FlatElement) => ({
  x: element.frame.x,
  y: element.frame.y,
  width: element.frame.width,
  height: element.frame.height,
});

const area = (element: FlatElement): number =>
  element.frame.width * element.frame.height;

export const artifactPresenceEvaluator: DeterministicEvaluator = {
  id: "artifact-presence",
  evaluate(context: EvaluationContext): Finding[] {
    const present = new Set(
      (context.captureManifest?.artifacts ?? []).map((a) => a.path),
    );
    const missing = context.requiredArtifacts.filter(
      (path) => !present.has(path),
    );
    if (missing.length === 0) {
      return [
        {
          id: "finding-artifact-presence",
          evaluator: "artifact-presence",
          check: "required-artifacts-present",
          kind: "deterministic",
          verdict: "pass",
          observations: [
            {
              type: "metadata",
              fact: `必要成果物がすべて存在する (${context.requiredArtifacts.join(", ")})`,
            },
          ],
          judgment: "capture 成果物は完全",
        },
      ];
    }
    return [
      {
        id: "finding-artifact-presence",
        evaluator: "artifact-presence",
        check: "required-artifacts-present",
        kind: "deterministic",
        verdict: "fail",
        observations: missing.map((path) => ({
          type: "metadata" as const,
          fact: `必要成果物が欠落: ${path}`,
        })),
        judgment: "capture 成果物が不足しており評価を信頼できない",
        remediation: "capture を再実行し、必要成果物が生成されることを確認する",
        evidence: [{ type: "metadata", artifact: "capture-manifest.json" }],
      },
    ];
  },
};

export const primaryControlCountEvaluator: DeterministicEvaluator = {
  id: "primary-control-count",
  evaluate(context: EvaluationContext): Finding[] {
    if (!context.uiSnapshot) {
      return [
        unknownForMissingSnapshot(
          "primary-control-count",
          "focus.single-primary-decision",
        ),
      ];
    }
    const buttons = flattenElements(context.uiSnapshot).filter(
      (el) => el.role === "button",
    );
    const primaries = buttons.filter((el) =>
      (el.traits ?? []).includes("primary"),
    );
    const verdict = primaries.length === 1 ? "pass" : "fail";
    const finding: Finding = {
      id: "finding-primary-control-count",
      evaluator: "primary-control-count",
      principle: "focus.single-primary-decision",
      check: "primary-control-count",
      kind: "deterministic",
      verdict,
      observations: [
        {
          type: "metadata",
          fact: `primary trait を持つボタンが ${primaries.length} 個 (ボタン総数 ${buttons.length})`,
        },
      ],
      judgment:
        verdict === "pass"
          ? "主操作は1つに限定されている"
          : "主操作が1つに限定されていない",
    };
    if (verdict === "fail") {
      finding.remediation = "主操作スタイルのコントロールを1つに絞る";
      finding.evidence =
        primaries.length > 0
          ? primaries.map((el) => ({
              type: "image_region" as const,
              artifact: context.screenshotArtifact,
              region: region(el),
            }))
          : [{ type: "metadata" as const, artifact: "ui-snapshot.json" }];
    }
    return [finding];
  },
};

export const primaryStyleDistinctEvaluator: DeterministicEvaluator = {
  id: "primary-secondary-style-distinct",
  evaluate(context: EvaluationContext): Finding[] {
    if (!context.uiSnapshot) {
      return [
        unknownForMissingSnapshot(
          "primary-secondary-style-distinct",
          "focus.single-primary-decision",
        ),
      ];
    }
    const buttons = flattenElements(context.uiSnapshot).filter(
      (el) => el.role === "button",
    );
    const primaries = buttons.filter((el) =>
      (el.traits ?? []).includes("primary"),
    );
    if (primaries.length !== 1) {
      return [
        {
          id: "finding-primary-style-distinct",
          evaluator: "primary-secondary-style-distinct",
          principle: "focus.single-primary-decision",
          check: "primary-secondary-style-distinct",
          kind: "deterministic",
          verdict: "unknown",
          observations: [
            {
              type: "metadata",
              fact: `primary が一意でないため比較不能 (${primaries.length} 個)`,
            },
          ],
          judgment: "primary-control-count の解決が先",
        },
      ];
    }
    const primary = primaries[0] as FlatElement;
    // Why not: 色・塗りの比較の方が §23.3 の意図に近い | Reason: ui-snapshot は §16.3 の項目列に限定され
    // スタイル情報を持たない。面積比 90% を近似指標とし、スタイル比較はモデル評価 (§23.4) に委ねる
    const competing = buttons.filter(
      (el) => el !== primary && area(el) >= area(primary) * 0.9,
    );
    const verdict = competing.length === 0 ? "pass" : "fail";
    const finding: Finding = {
      id: "finding-primary-style-distinct",
      evaluator: "primary-secondary-style-distinct",
      principle: "focus.single-primary-decision",
      check: "primary-secondary-style-distinct",
      kind: "deterministic",
      verdict,
      observations: [
        {
          type: "metadata",
          fact:
            verdict === "pass"
              ? "primary と同等サイズの競合ボタンは存在しない"
              : `primary と同等サイズ (面積比 90% 以上) のボタンが ${competing.length} 個`,
        },
      ],
      judgment:
        verdict === "pass"
          ? "副操作の視覚的重みは primary より弱い"
          : "副操作が primary と視覚的に競合している",
    };
    if (verdict === "fail") {
      finding.remediation = "副操作のサイズ・スタイルを弱める";
      finding.evidence = competing.map((el) => ({
        type: "image_region" as const,
        artifact: context.screenshotArtifact,
        region: region(el),
      }));
    }
    return [finding];
  },
};

export const requiredElementsEvaluator: DeterministicEvaluator = {
  id: "required-elements-present",
  evaluate(context: EvaluationContext): Finding[] {
    if (context.requiredElementIdentifiers.length === 0) {
      return [
        {
          id: "finding-required-elements",
          evaluator: "required-elements-present",
          check: "required-elements-present",
          kind: "deterministic",
          verdict: "unknown",
          observations: [
            {
              type: "metadata",
              fact: "scenario に required_element_identifiers が宣言されていない",
            },
          ],
          judgment: "必須要素の機械的対応付けが未宣言のため判定不能",
        },
      ];
    }
    if (!context.uiSnapshot) {
      return [
        unknownForMissingSnapshot("required-elements-present", undefined),
      ];
    }
    const identifiers = new Set(
      flattenElements(context.uiSnapshot)
        .map((el) => el.identifier)
        .filter((id): id is string => typeof id === "string"),
    );
    const missing = context.requiredElementIdentifiers.filter(
      (id) => !identifiers.has(id),
    );
    const verdict = missing.length === 0 ? "pass" : "fail";
    const finding: Finding = {
      id: "finding-required-elements",
      evaluator: "required-elements-present",
      check: "required-elements-present",
      kind: "deterministic",
      verdict,
      observations:
        verdict === "pass"
          ? [
              {
                type: "metadata",
                fact: "必須要素の identifier がすべて存在する",
              },
            ]
          : missing.map((id) => ({
              type: "metadata" as const,
              fact: `必須要素が見つからない: ${id}`,
            })),
      judgment:
        verdict === "pass"
          ? "タスク定義の必須要素は維持されている"
          : "タスク定義の必須要素が失われている",
    };
    if (verdict === "fail") {
      finding.remediation =
        "削除した必須要素を復元するか、タスク定義を更新する";
      finding.evidence = [{ type: "metadata", artifact: "ui-snapshot.json" }];
    }
    return [finding];
  },
};

function unknownForMissingSnapshot(
  check: string,
  principle: string | undefined,
): Finding {
  return {
    id: `finding-${check}`,
    evaluator: check,
    ...(principle !== undefined ? { principle } : {}),
    check,
    kind: "deterministic",
    verdict: "unknown",
    observations: [{ type: "metadata", fact: "ui-snapshot.json が存在しない" }],
    judgment:
      "UI メタデータが無いため判定不能 (§12.2 により画像からの推定はしない)",
  };
}
