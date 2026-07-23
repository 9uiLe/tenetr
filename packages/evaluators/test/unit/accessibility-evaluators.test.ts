import type { UISnapshot } from "@tenetr/spec";
import { describe, expect, it } from "vitest";
import type { EvaluationContext } from "../../src/index.js";
import {
  accessibilityLabelEvaluator,
  tapTargetEvaluator,
} from "../../src/index.js";

const element = (
  overrides: Partial<UISnapshot["elements"][number]> & {
    id: string;
    frame: { x: number; y: number; width: number; height: number };
  },
): UISnapshot["elements"][number] => ({
  role: "button",
  hittable: true,
  ...overrides,
});

const context = (elements: UISnapshot["elements"]): EvaluationContext => ({
  scenarioId: "completed",
  requiredArtifacts: ["screenshot.png"],
  requiredElementIdentifiers: [],
  screenshotArtifact: "screenshot.png",
  uiSnapshot: {
    schema_version: "1.0",
    scenario: "completed",
    // 440x956pt (scale 3) — フレーム比率 0.1 x 0.046 が 44pt 境界に相当
    screen: { width: 1320, height: 2868, scale: 3 },
    source: { tool: "test", raw_artifact: "" },
    elements,
  },
});

describe("accessibility-label evaluator", () => {
  it("passes when every interactive element has a non-empty label", () => {
    const ctx = context([
      element({
        id: "el-a",
        label: "つづける",
        frame: { x: 0, y: 0, width: 0.5, height: 0.1 },
      }),
    ]);
    expect(accessibilityLabelEvaluator.evaluate(ctx)[0]?.verdict).toBe("pass");
  });

  it("fails with an image region for each unlabeled interactive element", () => {
    const ctx = context([
      element({
        id: "el-a",
        label: "つづける",
        frame: { x: 0, y: 0, width: 0.5, height: 0.1 },
      }),
      element({ id: "el-b", frame: { x: 0, y: 0.5, width: 0.5, height: 0.1 } }),
      element({
        id: "el-c",
        label: "  ",
        frame: { x: 0.5, y: 0.5, width: 0.5, height: 0.1 },
      }),
    ]);
    const finding = accessibilityLabelEvaluator.evaluate(ctx)[0];
    expect(finding?.verdict).toBe("fail");
    expect(finding?.evidence).toHaveLength(2);
  });

  it("returns unknown without a ui snapshot (§12.2)", () => {
    const ctx = { ...context([]), uiSnapshot: undefined };
    expect(accessibilityLabelEvaluator.evaluate(ctx)[0]?.verdict).toBe(
      "unknown",
    );
  });
});

describe("tap-target-size evaluator", () => {
  it("passes when hittable targets are at least 44pt in both dimensions", () => {
    const ctx = context([
      element({
        id: "el-a",
        label: "つづける",
        frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 },
      }),
    ]);
    expect(tapTargetEvaluator.evaluate(ctx)[0]?.verdict).toBe("pass");
  });

  it("fails naming targets whose real size is below 44pt", () => {
    const ctx = context([
      element({
        id: "el-tiny",
        label: "閉じる",
        // 0.05 * 440pt = 22pt 幅 → 44pt 未満
        frame: { x: 0.9, y: 0.02, width: 0.05, height: 0.02 },
      }),
    ]);
    const finding = tapTargetEvaluator.evaluate(ctx)[0];
    expect(finding?.verdict).toBe("fail");
    expect(finding?.evidence?.[0]?.region).toBeDefined();
  });

  it("ignores non-hittable elements (visual-only decorations)", () => {
    const ctx = context([
      element({
        id: "el-decor",
        role: "image",
        hittable: false,
        frame: { x: 0.9, y: 0.02, width: 0.02, height: 0.01 },
      }),
      element({
        id: "el-a",
        label: "つづける",
        frame: { x: 0.05, y: 0.9, width: 0.9, height: 0.06 },
      }),
    ]);
    expect(tapTargetEvaluator.evaluate(ctx)[0]?.verdict).toBe("pass");
  });
});
