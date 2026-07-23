import type { UISnapshot } from "@tenetr/spec";
import { describe, expect, it } from "vitest";
import type { EvaluationContext } from "../../src/index.js";
import {
  artifactPresenceEvaluator,
  primaryControlCountEvaluator,
  primaryStyleDistinctEvaluator,
  requiredElementsEvaluator,
} from "../../src/index.js";

const button = (
  id: string,
  frame: { x: number; y: number; width: number; height: number },
  traits: string[] = [],
  identifier?: string,
): UISnapshot["elements"][number] => ({
  id: `el-${id}`,
  role: "button",
  label: id,
  frame,
  hittable: true,
  traits,
  ...(identifier !== undefined ? { identifier } : {}),
});

const snapshot = (elements: UISnapshot["elements"]): UISnapshot => ({
  schema_version: "1.0",
  scenario: "completed",
  screen: { width: 1320, height: 2868, scale: 3 },
  source: { tool: "test", raw_artifact: "" },
  elements,
});

const context = (overrides: Partial<EvaluationContext>): EvaluationContext => ({
  scenarioId: "completed",
  requiredArtifacts: ["screenshot.png"],
  requiredElementIdentifiers: [],
  screenshotArtifact: "screenshot.png",
  captureManifest: {
    scenario: "completed",
    artifacts: [{ path: "screenshot.png", sha256: "a".repeat(64) }],
  },
  ...overrides,
});

describe("artifact-presence evaluator", () => {
  it("passes when every required artifact is listed in the capture manifest", () => {
    const findings = artifactPresenceEvaluator.evaluate(context({}));
    expect(findings[0]?.verdict).toBe("pass");
  });

  it("fails with metadata evidence when a required artifact is missing", () => {
    const findings = artifactPresenceEvaluator.evaluate(
      context({ requiredArtifacts: ["screenshot.png", "ui-snapshot.json"] }),
    );
    expect(findings[0]?.verdict).toBe("fail");
    expect(findings[0]?.evidence?.length).toBeGreaterThan(0);
  });
});

describe("primary-control-count evaluator", () => {
  it("passes for exactly one primary button", () => {
    const ctx = context({
      uiSnapshot: snapshot([
        button("next", { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, [
          "primary",
        ]),
        button("detail", { x: 0.3, y: 0.8, width: 0.4, height: 0.03 }),
      ]),
    });
    expect(primaryControlCountEvaluator.evaluate(ctx)[0]?.verdict).toBe("pass");
  });

  it("fails with image regions for each competing primary button", () => {
    const ctx = context({
      uiSnapshot: snapshot([
        button("next", { x: 0.05, y: 0.8, width: 0.9, height: 0.06 }, [
          "primary",
        ]),
        button("share", { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, [
          "primary",
        ]),
      ]),
    });
    const finding = primaryControlCountEvaluator.evaluate(ctx)[0];
    expect(finding?.verdict).toBe("fail");
    expect(finding?.evidence).toHaveLength(2);
    expect(finding?.evidence?.[0]?.type).toBe("image_region");
  });

  it("returns unknown instead of guessing when the ui snapshot is absent (§12.2)", () => {
    expect(primaryControlCountEvaluator.evaluate(context({}))[0]?.verdict).toBe(
      "unknown",
    );
  });
});

describe("primary-secondary-style-distinct evaluator", () => {
  it("fails when a secondary button matches the primary's size", () => {
    const ctx = context({
      uiSnapshot: snapshot([
        button("next", { x: 0.05, y: 0.8, width: 0.9, height: 0.06 }, [
          "primary",
        ]),
        button("share", { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }),
      ]),
    });
    const finding = primaryStyleDistinctEvaluator.evaluate(ctx)[0];
    expect(finding?.verdict).toBe("fail");
    expect(finding?.evidence?.[0]?.region).toBeDefined();
  });

  it("passes when secondary controls are clearly smaller", () => {
    const ctx = context({
      uiSnapshot: snapshot([
        button("next", { x: 0.05, y: 0.9, width: 0.9, height: 0.06 }, [
          "primary",
        ]),
        button("detail", { x: 0.3, y: 0.85, width: 0.4, height: 0.03 }),
      ]),
    });
    expect(primaryStyleDistinctEvaluator.evaluate(ctx)[0]?.verdict).toBe(
      "pass",
    );
  });
});

describe("required-elements-present evaluator", () => {
  it("returns unknown when no machine mapping is declared", () => {
    expect(requiredElementsEvaluator.evaluate(context({}))[0]?.verdict).toBe(
      "unknown",
    );
  });

  it("fails naming the missing identifier", () => {
    const ctx = context({
      requiredElementIdentifiers: ["streak-card"],
      uiSnapshot: snapshot([
        button(
          "next",
          { x: 0.05, y: 0.9, width: 0.9, height: 0.06 },
          ["primary"],
          "primary-action",
        ),
      ]),
    });
    const finding = requiredElementsEvaluator.evaluate(ctx)[0];
    expect(finding?.verdict).toBe("fail");
    expect(finding?.observations[0]?.fact).toContain("streak-card");
  });

  it("passes when all declared identifiers exist", () => {
    const ctx = context({
      requiredElementIdentifiers: ["primary-action"],
      uiSnapshot: snapshot([
        button(
          "next",
          { x: 0.05, y: 0.9, width: 0.9, height: 0.06 },
          ["primary"],
          "primary-action",
        ),
      ]),
    });
    expect(requiredElementsEvaluator.evaluate(ctx)[0]?.verdict).toBe("pass");
  });
});
