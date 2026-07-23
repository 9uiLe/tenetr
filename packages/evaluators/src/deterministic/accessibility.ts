import type {
  DeterministicEvaluator,
  EvaluationContext,
  Finding,
  FlatElement,
} from "../context.js";
import { flattenElements } from "../context.js";

const INTERACTIVE_ROLES = new Set(["button", "toggle", "textfield"]);
const MIN_TAP_POINTS = 44;

const region = (element: FlatElement) => ({
  x: element.frame.x,
  y: element.frame.y,
  width: element.frame.width,
  height: element.frame.height,
});

const missingSnapshot = (check: string): Finding => ({
  id: `finding-${check}`,
  evaluator: check,
  check,
  kind: "deterministic",
  verdict: "unknown",
  observations: [{ type: "metadata", fact: "ui-snapshot.json が存在しない" }],
  judgment:
    "UI メタデータが無いため判定不能 (§12.2 により画像からの推定はしない)",
});

export const accessibilityLabelEvaluator: DeterministicEvaluator = {
  id: "accessibility-label",
  evaluate(context: EvaluationContext): Finding[] {
    if (!context.uiSnapshot) return [missingSnapshot("accessibility-label")];
    const interactive = flattenElements(context.uiSnapshot).filter((el) =>
      INTERACTIVE_ROLES.has(el.role),
    );
    const unlabeled = interactive.filter(
      (el) => typeof el.label !== "string" || el.label.trim() === "",
    );
    const verdict = unlabeled.length === 0 ? "pass" : "fail";
    const finding: Finding = {
      id: "finding-accessibility-label",
      evaluator: "accessibility-label",
      check: "accessibility-label",
      kind: "deterministic",
      verdict,
      observations: [
        {
          type: "metadata",
          fact:
            verdict === "pass"
              ? `全対話要素 (${interactive.length}) に accessibility label がある`
              : `label の無い対話要素が ${unlabeled.length} 個`,
        },
      ],
      judgment:
        verdict === "pass"
          ? "スクリーンリーダーで全対話要素へ到達できる"
          : "label の無い対話要素はスクリーンリーダーで内容が読めない",
    };
    if (verdict === "fail") {
      finding.remediation =
        "各対話要素に内容を表す accessibilityLabel を設定する";
      finding.evidence = unlabeled.map((el) => ({
        type: "image_region" as const,
        artifact: context.screenshotArtifact,
        region: region(el),
      }));
    }
    return [finding];
  },
};

export const tapTargetEvaluator: DeterministicEvaluator = {
  id: "tap-target-size",
  evaluate(context: EvaluationContext): Finding[] {
    if (!context.uiSnapshot) return [missingSnapshot("tap-target-size")];
    const { width, height, scale } = {
      scale: 1,
      ...context.uiSnapshot.screen,
    };
    const pointWidth = width / scale;
    const pointHeight = height / scale;
    const hittable = flattenElements(context.uiSnapshot).filter(
      (el) => INTERACTIVE_ROLES.has(el.role) && el.hittable === true,
    );
    const tooSmall = hittable.filter((el) => {
      const w = el.frame.width * pointWidth;
      const h = el.frame.height * pointHeight;
      return w < MIN_TAP_POINTS || h < MIN_TAP_POINTS;
    });
    const verdict = tooSmall.length === 0 ? "pass" : "fail";
    const finding: Finding = {
      id: "finding-tap-target-size",
      evaluator: "tap-target-size",
      check: "tap-target-size",
      kind: "deterministic",
      verdict,
      observations: [
        {
          type: "metadata",
          fact:
            verdict === "pass"
              ? `全タップ対象 (${hittable.length}) が ${MIN_TAP_POINTS}pt 基準を満たす`
              : `${MIN_TAP_POINTS}pt 未満のタップ対象が ${tooSmall.length} 個`,
        },
      ],
      judgment:
        verdict === "pass"
          ? "タップ領域は操作基準を満たす"
          : "小さすぎるタップ領域は誤操作・操作不能の原因になる",
    };
    if (verdict === "fail") {
      finding.remediation = `タップ対象の実寸を ${MIN_TAP_POINTS}pt 四方以上にする`;
      finding.evidence = tooSmall.map((el) => ({
        type: "image_region" as const,
        artifact: context.screenshotArtifact,
        region: region(el),
      }));
    }
    return [finding];
  },
};
