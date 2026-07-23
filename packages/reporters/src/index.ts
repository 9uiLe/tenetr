export const REPORT_FORMATS = ["json", "html"] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];
