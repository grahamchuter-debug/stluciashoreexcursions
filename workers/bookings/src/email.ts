/**
 * Transactional email via Resend HTTP API (no SDK — Workers-friendly).
 * Pattern reused from sister destination Workers (Villefranche / Zadar / Zakynthos):
 * persist the booking first, enqueue an outbox row, then attempt send.
 * Send failure must never lose the booking or change payment state.
 */
import type { EmailOutboxKind, EmailOutboxRow } from "./db";
import {
  claimEmailOutboxForSend,
  getRetryableEmailOutbox,
  markEmailOutboxFailed,
  markEmailOutboxSent,
} from "./db";

type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_SENDING_ENABLED?: string;
  /** Test-only redirect. Applied ONLY when PAYMENTS_MODE=test. Ignored in live/preview. */
  TEST_ONLY_EMAIL_OVERRIDE?: string;
  PAYMENTS_MODE?: string;
  DB: D1Database;
};

export type ProviderSendResult = { accepted: true; messageId: string } | { accepted: false; error: string };

export function emailSendingEnabled(env: { EMAIL_SENDING_ENABLED?: string }): boolean {
  return String(env.EMAIL_SENDING_ENABLED ?? "false") === "true";
}

/**
 * Resolve the actual outbound recipient.
 * TEST_ONLY_EMAIL_OVERRIDE can only rewrite recipients when PAYMENTS_MODE=test.
 * Live / preview / any other mode always keeps the intended address (even if the var is set).
 */
export function resolveOutboundRecipient(
  env: { PAYMENTS_MODE?: string; TEST_ONLY_EMAIL_OVERRIDE?: string },
  intendedTo: string,
): { to: string; overridden: boolean } {
  const intended = intendedTo.trim();
  const override = (env.TEST_ONLY_EMAIL_OVERRIDE ?? "").trim();
  if (!override) return { to: intended, overridden: false };
  if (String(env.PAYMENTS_MODE) !== "test") {
    console.warn(
      JSON.stringify({
        test_email_override_ignored: true,
        paymentsMode: String(env.PAYMENTS_MODE ?? ""),
      }),
    );
    return { to: intended, overridden: false };
  }
  return { to: override, overridden: true };
}

/** Verified sister-site sender: bookings@notifications.wowatour.com */
export function formatEmailFrom(env: EmailEnv): string {
  const address = (env.EMAIL_FROM ?? "").trim();
  if (!address) {
    throw new Error("EMAIL_FROM is required (verified sender address)");
  }
  const name = (env.EMAIL_FROM_NAME ?? "St Lucia Shore Excursions").trim();
  if (address.includes("<")) return address;
  return `${name} <${address}>`;
}

export function formatEmailReplyTo(env: EmailEnv): string | undefined {
  const replyTo = (env.EMAIL_REPLY_TO ?? "").trim();
  return replyTo || undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailHtml(heading: string, lines: string[]): string {
  const body = lines.map((line) => (line ? `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>` : "<p style=\"margin:0 0 8px;\">&nbsp;</p>")).join("");
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#111;">
  <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(heading)}</h1>
  ${body}
</body></html>`;
}

export async function sendViaResend(
  env: EmailEnv,
  args: { to: string; subject: string; text: string; html: string },
): Promise<ProviderSendResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { accepted: false, error: "RESEND_API_KEY is not configured" };
  }

  let from: string;
  try {
    from = formatEmailFrom(env);
  } catch (err) {
    return { accepted: false, error: String(err) };
  }

  const replyTo = formatEmailReplyTo(env);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    console.error(JSON.stringify({ email_provider_error: true, status: response.status }));
    const msg = body.error?.message || body.message || body.name || `Resend HTTP ${response.status}`;
    return { accepted: false, error: String(msg).slice(0, 400) };
  }

  if (!body.id) {
    return { accepted: false, error: "Resend accepted but returned no message id" };
  }

  return { accepted: true, messageId: body.id };
}

async function deliverOneRow(env: EmailEnv, row: EmailOutboxRow): Promise<void> {
  if (!emailSendingEnabled(env)) {
    console.info(
      JSON.stringify({
        email_deferred_sending_disabled: true,
        kind: row.kind,
        bookingReference: row.booking_reference,
      }),
    );
    return;
  }

  const claimed = await claimEmailOutboxForSend(env, row.id);
  if (!claimed) return;

  let payload: { to?: string; subject?: string; text?: string; html?: string; heading?: string };
  try {
    payload = JSON.parse(row.payload_json || "{}") as typeof payload;
  } catch {
    await markEmailOutboxFailed(env, row.id, "invalid_payload");
    return;
  }

  const intendedTo = payload.to?.trim();
  const subject = payload.subject?.trim();
  const text = payload.text ?? "";
  if (!intendedTo || !subject) {
    await markEmailOutboxFailed(env, row.id, "missing_to_or_subject");
    return;
  }

  const { to, overridden } = resolveOutboundRecipient(env, intendedTo);
  const html = payload.html || renderEmailHtml(payload.heading || subject, text.split("\n"));

  try {
    const result = await sendViaResend(env, { to, subject, text, html });
    if (!result.accepted) {
      console.error("ops_alert", { kind: "email_send_failed", outboxKind: row.kind, bookingReference: row.booking_reference });
      await markEmailOutboxFailed(env, row.id, result.error);
      return;
    }
    await markEmailOutboxSent(env, row.id, result.messageId);
    console.info(
      JSON.stringify({
        email_sent: true,
        kind: row.kind,
        bookingReference: row.booking_reference,
        intendedTo,
        actualTo: to,
        recipientOverridden: overridden,
        providerMessageId: result.messageId,
      }),
    );
  } catch (err) {
    console.error("ops_alert", {
      kind: "email_outbox_delivery_failed",
      bookingReference: row.booking_reference,
      error: String(err).slice(0, 200),
    });
    await markEmailOutboxFailed(env, row.id, String(err));
  }
}

export async function deliverOutboxForBooking(env: EmailEnv, bookingReference: string): Promise<void> {
  const rows = await getRetryableEmailOutbox(env, bookingReference);
  for (const row of rows) {
    await deliverOneRow(env, row);
  }
}

export type { EmailOutboxKind };
