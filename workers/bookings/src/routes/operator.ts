import { jsonResponse } from "../cors";
import { confirmBooking, declineBooking } from "../operator-actions";

function operatorAllowed(request: Request, env: Env): boolean {
  if (String(env.PAYMENTS_MODE) === "live") return false;
  const expected = env.OPERATOR_TOKEN?.trim() || env.OPERATOR_TEST_TOKEN?.trim();
  if (!expected) return false;
  const header = request.headers.get("X-St-Lucia-Operator-Token")?.trim();
  return Boolean(header && header === expected);
}

async function readReference(request: Request): Promise<string | null> {
  const body = (await request.json().catch(() => null)) as { reference?: string } | null;
  const reference = body?.reference?.trim();
  return reference || null;
}

export async function handleOperatorConfirm(request: Request, env: Env): Promise<Response> {
  if (!operatorAllowed(request, env)) {
    return jsonResponse({ ok: false, code: "OPERATOR_FORBIDDEN", message: "Operator confirm requires authentication." }, 403);
  }
  const reference = await readReference(request);
  if (!reference) return jsonResponse({ ok: false, code: "REFERENCE", message: "Booking reference is required." }, 400);

  const result = await confirmBooking(env, reference, { source: "header" });
  if (!result.ok) {
    return jsonResponse({ ok: false, code: result.code, message: result.message }, result.httpStatus);
  }
  return jsonResponse({
    ok: true,
    reference: result.reference,
    status: result.status,
    payment_status: result.payment_status,
    refunded: false,
    duplicate: result.duplicate ?? false,
  });
}

export async function handleOperatorDecline(request: Request, env: Env): Promise<Response> {
  if (!operatorAllowed(request, env)) {
    return jsonResponse({ ok: false, code: "OPERATOR_FORBIDDEN", message: "Operator decline requires authentication." }, 403);
  }
  const reference = await readReference(request);
  if (!reference) return jsonResponse({ ok: false, code: "REFERENCE", message: "Booking reference is required." }, 400);

  const result = await declineBooking(env, reference, { source: "header" });
  if (!result.ok) {
    return jsonResponse({ ok: false, code: result.code, message: result.message }, result.httpStatus);
  }
  return jsonResponse({
    ok: true,
    reference: result.reference,
    status: result.status,
    payment_status: result.payment_status,
    refundId: result.refundId,
    refundStatus: result.refundStatus,
    refunded: result.refunded,
    amountRefundedCents: result.amountRefundedCents,
    duplicate: result.duplicate ?? false,
  });
}
