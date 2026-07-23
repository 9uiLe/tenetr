import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/test/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "contract",
          include: ["packages/*/test/contract/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "golden",
          include: ["packages/*/test/golden/**/*.test.ts"],
        },
      },
    ],
  },
});
