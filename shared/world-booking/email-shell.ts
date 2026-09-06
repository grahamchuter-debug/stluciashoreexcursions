/**
 * World 2.0 transactional email shell — destination-configurable, email-client safe.
 * Inline CSS only; no external images required.
 */
import type { DestinationBookingCore } from "./types";

export type EmailStatusTone = "awaiting" | "confirmed" | "declined" | "action";

export type BookingSummaryRow = {
  label: string;
  value: string;
};

export type CustomerEmailShellInput = {
  brand: Pick<DestinationBookingCore, "siteName" | "siteUrl" | "bookingEmail" | "contactPath">;
  preheader?: string;
  eyebrow: string;
  headline: string;
  statusLabel: string;
  statusTone: EmailStatusTone;
  introParagraphs: string[];
  summaryRows: BookingSummaryRow[];
  infoPanel?: { title: string; paragraphs: string[] };
  closingParagraphs?: string[];
  footerTagline?: string;
};

export type OpsEmailShellInput = {
  destinationLabel: string;
  headline: string;
  statusLabel: string;
  summaryRows: BookingSummaryRow[];
  actionSteps: string[];
  reviewUrl?: string;
};

const BRAND = {
  navy: "#12304f",
  navyMid: "#1a4576",
  terracotta: "#d69a34",
  terracottaDeep: "#cf5f3a",
  sand: "#eef4fb",
  border: "#d7e5f5",
  text: "#101828",
  muted: "#4a5565",
  white: "#ffffff",
} as const;

const STATUS_STYLES: Record<EmailStatusTone, { bg: string; color: string; border: string }> = {
  awaiting: { bg: "#fff8eb", color: "#7b3306", border: "#f3ddb0" },
  confirmed: { bg: "#ecfdf3", color: "#166534", border: "#bbf7d0" },
  declined: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  action: { bg: "#eef4fb", color: BRAND.navy, border: BRAND.border },
};

export function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function formatHumanBookingDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummaryTable(rows: BookingSummaryRow[]): string {
  const cells = rows
    .filter((row) => row.value.trim())
    .map(
      (row) => `<tr>
        <td style="padding:10px 0 4px;font-size:11px;line-height:1.3;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};vertical-align:top;width:38%;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0 4px;font-size:15px;line-height:1.45;color:${BRAND.text};font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${cells}</table>`;
}

function renderStatusBadge(label: string, tone: EmailStatusTone): string {
  const style = STATUS_STYLES[tone];
  return `<div style="display:inline-block;margin:0 0 20px;padding:10px 14px;border:1px solid ${style.border};border-radius:999px;background:${style.bg};color:${style.color};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(label)}</div>`;
}

function renderParagraphs(paragraphs: string[]): string {
  return paragraphs
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${BRAND.text};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
}

function emailDocument(title: string, body: string, preheader?: string): string {
  const hiddenPreheader = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:Georgia,'Times New Roman',serif;color:${BRAND.text};">
  ${hiddenPreheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          ${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderCustomerBookingEmailHtml(input: CustomerEmailShellInput): string {
  const helpUrl = `${input.brand.siteUrl.replace(/\/$/, "")}${input.brand.contactPath}`;
  const helpEmail = input.brand.bookingEmail;
  const body = `
    <tr><td style="padding:28px 28px 18px;background:${BRAND.navy};">
      <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#dbeafe;font-weight:700;">${escapeHtml(input.eyebrow)}</div>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:${BRAND.navy};font-weight:700;">${escapeHtml(input.headline)}</h1>
      ${renderStatusBadge(input.statusLabel, input.statusTone)}
      ${renderParagraphs(input.introParagraphs)}
    </td></tr>
    <tr><td style="padding:0 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;background:${BRAND.sand};">
        <tr><td style="padding:18px 20px;">
          ${renderSummaryTable(input.summaryRows)}
        </td></tr>
      </table>
    </td></tr>
    ${
      input.infoPanel
        ? `<tr><td style="padding:0 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${BRAND.terracotta};background:#fffdf8;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.terracottaDeep};font-weight:700;margin:0 0 8px;">${escapeHtml(input.infoPanel.title)}</div>
          ${renderParagraphs(input.infoPanel.paragraphs)}
        </td></tr>
      </table>
    </td></tr>`
        : ""
    }
    ${
      input.closingParagraphs?.length
        ? `<tr><td style="padding:0 28px 8px;">${renderParagraphs(input.closingParagraphs)}</td></tr>`
        : ""
    }
    <tr><td style="padding:8px 28px 28px;border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:${BRAND.text};"><strong>Need help with your request?</strong></p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${BRAND.muted};">Reply to this email and include your booking reference, or contact us at <a href="mailto:${escapeHtml(helpEmail)}" style="color:${BRAND.navyMid};text-decoration:underline;">${escapeHtml(helpEmail)}</a>.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(input.brand.siteName)}<br>${escapeHtml(input.footerTagline ?? "Cruise-first shore excursions")}<br><a href="${escapeHtml(helpUrl)}" style="color:${BRAND.navyMid};text-decoration:none;">${escapeHtml(helpUrl.replace(/^https?:\/\//, ""))}</a></p>
    </td></tr>`;
  return emailDocument(input.headline, body, input.preheader);
}

export function renderCustomerBookingEmailText(input: CustomerEmailShellInput): string {
  const lines = [
    input.eyebrow.toUpperCase(),
    "",
    input.headline,
    input.statusLabel,
    "",
    ...input.introParagraphs,
    "",
    ...input.summaryRows.flatMap((row) => [row.label.toUpperCase(), row.value, ""]),
  ];
  if (input.infoPanel) {
    lines.push(input.infoPanel.title.toUpperCase(), ...input.infoPanel.paragraphs, "");
  }
  if (input.closingParagraphs?.length) {
    lines.push(...input.closingParagraphs, "");
  }
  lines.push(
    "Need help with your request?",
    `Reply to this email and include your booking reference, or contact ${input.brand.bookingEmail}.`,
    "",
    input.brand.siteName,
    input.footerTagline ?? "Cruise-first shore excursions",
  );
  return lines.join("\n").trim();
}

export function renderOpsRequestEmailHtml(input: OpsEmailShellInput): string {
  const reviewButton = input.reviewUrl
    ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;padding:14px 22px;background:${BRAND.navy};color:${BRAND.white};text-decoration:none;border-radius:999px;font-size:15px;font-weight:700;">Review booking</a></p>`
    : "";
  const body = `
    <tr><td style="padding:24px 24px 12px;background:${BRAND.navy};">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#dbeafe;font-weight:700;">${escapeHtml(input.destinationLabel)}</div>
      <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;color:${BRAND.white};font-weight:700;">${escapeHtml(input.headline)}</h1>
    </td></tr>
    <tr><td style="padding:24px;">
      ${renderStatusBadge(input.statusLabel, "action")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;background:${BRAND.sand};margin:0 0 20px;">
        <tr><td style="padding:18px 20px;">${renderSummaryTable(input.summaryRows)}</td></tr>
      </table>
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.terracottaDeep};font-weight:700;margin:0 0 10px;">Action required</div>
      <ol style="margin:0 0 0 18px;padding:0;color:${BRAND.text};font-size:15px;line-height:1.7;">
        ${input.actionSteps.map((step) => `<li style="margin:0 0 8px;">${escapeHtml(step)}</li>`).join("")}
      </ol>
      ${reviewButton}
      <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">This link is for Wow A Tour operations only. It expires automatically and does not contain permanent credentials.</p>
    </td></tr>`;
  return emailDocument(input.headline, body, input.statusLabel);
}

export function renderOpsRequestEmailText(input: OpsEmailShellInput): string {
  const lines = [
    input.destinationLabel.toUpperCase(),
    input.headline,
    input.statusLabel,
    "",
    ...input.summaryRows.flatMap((row) => [row.label.toUpperCase(), row.value, ""]),
    "ACTION REQUIRED",
    ...input.actionSteps.map((step, index) => `${index + 1}. ${step}`),
  ];
  if (input.reviewUrl) {
    lines.push("", "Review booking:", input.reviewUrl);
  }
  return lines.join("\n").trim();
}
