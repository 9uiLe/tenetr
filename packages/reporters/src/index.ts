export const REPORT_FORMATS = ["json", "html"] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];

export { renderHtml } from "./html.js";
export type {
  CaptureManifestForReport,
  ReportData,
  ReportImages,
  ReportVersions,
} from "./report-data.js";
export { buildJsonReport, sortFindingsForDisplay } from "./report-data.js";
