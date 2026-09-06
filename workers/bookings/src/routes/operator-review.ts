import { formatHumanBookingDate, guestCountLabel } from "../../../../shared/world-booking";
import { findStLuciaBookingProduct } from "../../../../shared/destinations/st-lucia-products";
import { getBookingByReference } from "../db";
import { LIVE_PAYMENTS_CODE_ENABLED } from "../live-gate";
import { formatMajorMoneyForEmail } from "../logic";
import { confirmBooking, declineBooking, guestsFromBooking } from "../operator-actions";
import {
  consumeOperatorReviewToken,
  validateOperatorReviewToken,
} from "../operator-tokens";

/**
 * Tokenised operator UI is allowed in TEST always, and in LIVE only when the
 * live payments code flag is on. Header-token mutation API remains live-blocked.
 * Every action still requires a valid booking-scoped single-use token.
 */
function operatorReviewAllowed(env: Env): boolean {
  const mode = String(env.PAYMENTS_MODE);
  if (mode === "live") return LIVE_PAYMENTS_CODE_ENABLED;
  if (mode === "test") return true;
  return false;
}

const PAGE = {
  navy: "#12304f",
  terracotta: "#d69a34",
  sand: "#eef4fb",
  border: "#d7e5f5",
  text: "#101828",
  muted: "#4a5565",
  white: "#ffffff",
  danger: "#991b1b",
  dangerBg: "#fef2f2",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage(title: string, body: string, robots = "noindex, nofollow, noarchive"): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${robots}">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#f6f8fb; color:${PAGE.text}; }
    .wrap { max-width:640px; margin:0 auto; padding:24px 16px 48px; }
    .card { background:${PAGE.white}; border:1px solid ${PAGE.border}; border-radius:16px; padding:24px; }
    h1 { margin:0 0 8px; font-size:1.65rem; color:${PAGE.navy}; }
    .eyebrow { font-size:0.75rem; letter-spacing:0.12em; text-transform:uppercase; color:${PAGE.muted}; font-weight:700; }
    .badge { display:inline-block; margin:12px 0 18px; padding:8px 12px; border-radius:999px; background:${PAGE.sand}; color:${PAGE.navy}; font-size:0.75rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; }
    .grid { display:grid; gap:12px; margin:20px 0; }
    .row { border-top:1px solid ${PAGE.border}; padding-top:12px; }
    .label { font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; color:${PAGE.muted}; margin-bottom:4px; }
    .value { font-size:1rem; font-weight:600; line-height:1.45; word-break:break-word; }
    .actions { display:grid; gap:12px; margin-top:24px; }
    .btn { display:block; width:100%; box-sizing:border-box; text-align:center; padding:14px 18px; border-radius:999px; border:none; font-size:1rem; font-weight:700; text-decoration:none; cursor:pointer; }
    .btn-primary { background:${PAGE.navy}; color:${PAGE.white}; }
    .btn-danger { background:${PAGE.danger}; color:${PAGE.white}; }
    .btn-secondary { background:${PAGE.white}; color:${PAGE.navy}; border:1px solid ${PAGE.border}; }
    .panel { margin-top:18px; padding:16px; border-radius:12px; background:${PAGE.sand}; }
    .panel-danger { background:${PAGE.dangerBg}; color:${PAGE.danger}; }
    .muted { color:${PAGE.muted}; font-size:0.95rem; line-height:1.55; }
    form { margin:0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">${body}</div>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": robots,
    },
  });
}

function errorPage(title: string, message: string, httpStatus = 403): Response {
  const body = `
    <div class="eyebrow">St Lucia booking operations</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="muted">${escapeHtml(message)}</p>
    <div class="panel panel-danger">
      <p class="muted" style="margin:0;">If you still need to action this booking, use the latest ACTION REQUIRED email or contact your technical support contact. Permanent operator credentials are never sent by email.</p>
    </div>`;
  const response = htmlPage(title, body);
  return new Response(response.body, {
    status: httpStatus,
    headers: response.headers,
  });
}

function bookingSummaryHtml(booking: NonNullable<Awaited<ReturnType<typeof getBookingByReference>>>, amountLabel: string, guestsLabel: string) {
  return `
    <div class="grid">
      <div class="row"><div class="label">Reference</div><div class="value">${escapeHtml(booking.booking_reference)}</div></div>
      <div class="row"><div class="label">Excursion</div><div class="value">${escapeHtml(booking.product_name)}</div></div>
      <div class="row"><div class="label">Date</div><div class="value">${escapeHtml(formatHumanBookingDate(booking.cruise_date))}</div></div>
      <div class="row"><div class="label">Ship</div><div class="value">${escapeHtml(booking.ship_name)}</div></div>
      <div class="row"><div class="label">Guests</div><div class="value">${escapeHtml(guestsLabel)}</div></div>
      <div class="row"><div class="label">Customer</div><div class="value">${escapeHtml(booking.customer_name)}</div></div>
      <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(booking.customer_email)}</div></div>
      <div class="row"><div class="label">Mobile / WhatsApp</div><div class="value">${escapeHtml(booking.customer_phone || "Not supplied")}</div></div>
      <div class="row"><div class="label">Payment</div><div class="value">${escapeHtml(`${amountLabel} paid`)}</div></div>
      ${
        booking.operational_notes?.trim()
          ? `<div class="row"><div class="label">Customer notes</div><div class="value">${escapeHtml(booking.operational_notes.trim())}</div></div>`
          : ""
      }
    </div>`;
}

function statusBadge(booking: NonNullable<Awaited<ReturnType<typeof getBookingByReference>>>) {
  if (booking.status === "confirmed") return "Confirmed";
  if (booking.status === "supplier_declined" || booking.payment_status === "refunded") return "Declined · Refunded";
  return "Paid · Supplier confirmation required";
}

async function readForm(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await request.text());
  }
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  const params = new URLSearchParams();
  if (body) {
    for (const [key, value] of Object.entries(body)) params.set(key, String(value));
  }
  return params;
}

export async function handleOperatorReviewPage(request: Request, env: Env): Promise<Response> {
  if (!operatorReviewAllowed(env)) {
    return errorPage(
      "Unavailable",
      "Operator review is not available in this payments mode. Live actions require the live payments code flag and a valid booking-scoped token.",
      503,
    );
  }

  const url = new URL(request.url);
  const reference = url.searchParams.get("ref")?.trim() ?? "";
  const token = url.searchParams.get("t")?.trim() ?? "";
  const step = url.searchParams.get("step")?.trim() ?? "review";

  const validation = await validateOperatorReviewToken(env, reference, token);
  if (!validation.ok) {
    const message =
      validation.code === "EXPIRED" || validation.code === "USED"
        ? "This action link has expired or has already been used."
        : "This operator link is invalid.";
    return errorPage("Link unavailable", message, 403);
  }

  const booking = await getBookingByReference(env, reference);
  if (!booking) return errorPage("Booking not found", "This booking could not be found.", 404);

  const product = findStLuciaBookingProduct(booking.product_id);
  const guestsLabel = product ? guestCountLabel(product, guestsFromBooking(booking)) : String(booking.guest_count);
  const amountLabel = formatMajorMoneyForEmail(Math.round(booking.amount_total_cents / 100), booking.currency);
  const liveMode = String(env.PAYMENTS_MODE) === "live";

  if (booking.status === "confirmed") {
    return htmlPage(
      "Booking confirmed",
      `<div class="eyebrow">St Lucia booking request</div><h1>Booking already confirmed</h1><div class="badge">Confirmed</div><p class="muted">Reference ${escapeHtml(booking.booking_reference)} is already confirmed. The customer confirmation email was sent when this booking was actioned.</p>${bookingSummaryHtml(booking, amountLabel, guestsLabel)}`,
    );
  }

  if (booking.status === "supplier_declined" || booking.payment_status === "refunded") {
    return htmlPage(
      "Booking declined",
      `<div class="eyebrow">St Lucia booking request</div><h1>Booking already declined</h1><div class="badge">Declined · Refunded</div><p class="muted">Reference ${escapeHtml(booking.booking_reference)} has already been declined and refunded.</p>${bookingSummaryHtml(booking, amountLabel, guestsLabel)}`,
    );
  }

  if (step === "confirm") {
    return htmlPage(
      "Confirm booking",
      `<div class="eyebrow">St Lucia booking request</div><h1>Confirm this excursion?</h1><div class="badge">${escapeHtml(statusBadge(booking))}</div>
      ${bookingSummaryHtml(booking, amountLabel, guestsLabel)}
      <form class="actions" method="POST" action="/operator/review/action">
        <input type="hidden" name="ref" value="${escapeHtml(reference)}">
        <input type="hidden" name="t" value="${escapeHtml(token)}">
        <input type="hidden" name="action" value="confirm">
        <button class="btn btn-primary" type="submit">Yes — confirm booking</button>
        <a class="btn btn-secondary" href="/operator/review?ref=${encodeURIComponent(reference)}&amp;t=${encodeURIComponent(token)}">Back</a>
      </form>`,
    );
  }

  if (step === "decline") {
    const liveWarning = liveMode
      ? `<div class="panel panel-danger"><p class="muted" style="margin:0;font-weight:700;">THIS WILL ISSUE A FULL STRIPE LIVE REFUND OF ${escapeHtml(amountLabel)}.</p><p class="muted" style="margin:10px 0 0;">This cannot be undone from this page. The customer will receive a refund email.</p></div>`
      : `<div class="panel panel-danger"><p class="muted" style="margin:0;">This will mark the excursion as unable to confirm, issue a full Stripe refund, and notify the customer.</p></div>`;
    return htmlPage(
      "Decline booking",
      `<div class="eyebrow">St Lucia booking request</div><h1>Decline this booking and refund ${escapeHtml(amountLabel)}?</h1>
      ${liveWarning}
      ${bookingSummaryHtml(booking, amountLabel, guestsLabel)}
      <form class="actions" method="POST" action="/operator/review/action">
        <input type="hidden" name="ref" value="${escapeHtml(reference)}">
        <input type="hidden" name="t" value="${escapeHtml(token)}">
        <input type="hidden" name="action" value="decline">
        <input type="hidden" name="confirmRefund" value="yes">
        <input type="hidden" name="auditReason" value="Controlled production test — refund">
        <button class="btn btn-danger" type="submit">Decline &amp; refund ${escapeHtml(amountLabel)}</button>
        <a class="btn btn-secondary" href="/operator/review?ref=${encodeURIComponent(reference)}&amp;t=${encodeURIComponent(token)}">Back</a>
      </form>`,
    );
  }

  return htmlPage(
    "Review booking",
    `<div class="eyebrow">St Lucia booking request</div><h1>Review booking</h1><div class="badge">${escapeHtml(statusBadge(booking))}</div>
    ${liveMode ? `<div class="panel panel-danger"><p class="muted" style="margin:0;font-weight:700;">LIVE MODE — decline issues a real Stripe refund of ${escapeHtml(amountLabel)}.</p></div>` : ""}
    ${bookingSummaryHtml(booking, amountLabel, guestsLabel)}
    <div class="actions">
      <a class="btn btn-primary" href="/operator/review?ref=${encodeURIComponent(reference)}&amp;t=${encodeURIComponent(token)}&amp;step=confirm">Confirm booking</a>
      <a class="btn btn-danger" href="/operator/review?ref=${encodeURIComponent(reference)}&amp;t=${encodeURIComponent(token)}&amp;step=decline">Decline &amp; refund</a>
    </div>
    <p class="muted" style="margin-top:18px;">Check availability with the local supplier before confirming. Declining will issue a full refund.</p>`,
  );
}

export async function handleOperatorReviewAction(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return errorPage("Method not allowed", "Use the review page buttons to action this booking.", 405);
  }
  if (!operatorReviewAllowed(env)) {
    return errorPage(
      "Unavailable",
      "Operator review is not available in this payments mode. Live actions require the live payments code flag and a valid booking-scoped token.",
      503,
    );
  }

  const form = await readForm(request);
  const reference = form.get("ref")?.trim() ?? "";
  const token = form.get("t")?.trim() ?? "";
  const action = form.get("action")?.trim() ?? "";
  const auditReason = form.get("auditReason")?.trim() || null;

  const validation = await validateOperatorReviewToken(env, reference, token);
  if (!validation.ok) {
    const message =
      validation.code === "EXPIRED" || validation.code === "USED"
        ? "This action link has expired or has already been used."
        : "This operator link is invalid.";
    return errorPage("Link unavailable", message, 403);
  }

  if (action === "decline" && form.get("confirmRefund") !== "yes") {
    return errorPage("Confirmation required", "Decline and refund requires deliberate confirmation.", 400);
  }

  const ctx = {
    source: "token" as const,
    tokenId: validation.tokenId,
    auditDetail: action === "decline" ? auditReason : null,
  };
  const result =
    action === "confirm"
      ? await confirmBooking(env, reference, ctx)
      : action === "decline"
        ? await declineBooking(env, reference, ctx)
        : null;

  if (!result) return errorPage("Unknown action", "Choose confirm or decline from the review page.", 400);

  if (!result.ok) {
    return errorPage("Action blocked", result.message, result.httpStatus);
  }

  await consumeOperatorReviewToken(env, validation.tokenId);

  if (action === "confirm") {
    return htmlPage(
      "Booking confirmed",
      `<div class="eyebrow">St Lucia booking request</div><h1>Booking confirmed</h1><p class="muted">Reference ${escapeHtml(reference)} is now confirmed. The customer confirmation email has been queued.</p>`,
    );
  }

  return htmlPage(
    "Booking declined",
    `<div class="eyebrow">St Lucia booking request</div><h1>Booking declined &amp; refund ${result.refunded ? "issued" : "initiated"}</h1><p class="muted">Reference ${escapeHtml(reference)} has been declined. ${result.refunded ? "The full refund succeeded." : "Stripe is processing the refund."} The customer refund email has been queued.</p>`,
  );
}
