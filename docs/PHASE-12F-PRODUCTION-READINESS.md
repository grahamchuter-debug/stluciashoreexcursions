# Phase 12F — Production readiness / live configuration (St Lucia)

Status: **COMPLETE** — production ready, **still locked**. Awaiting explicit Phase 12G live unlock.

Worker: `st-lucia-bookings-prod` · mode `live` · deployment `c53dcbae-b933-4f7e-bfe8-339602da67ae`  
Gates: `LIVE_PAYMENTS_CODE_ENABLED=false` · `BOOKINGS_ENABLED=false` · `EMAIL_SENDING_ENABLED=false`

## PROD D1

| Name | UUID |
|------|------|
| `st-lucia-bookings-prod` | `46895870-4a35-456c-a873-2d187a80b363` |

Migrations `0001`–`0003` applied. Synthetic / TEST data in PROD: **NONE** (0 bookings, 0 email outbox).

Binding: PROD Worker → PROD D1 only. TEST D1 / other destination databases untouched.

## Secrets (names / presence only — values never recorded)

| Secret | Present |
|--------|---------|
| `STRIPE_SECRET_KEY` | YES (`sk_live_` prefix) |
| `STRIPE_WEBHOOK_SECRET` | YES (`whsec_` prefix) |
| `RESEND_API_KEY` | YES (`re_` prefix) |
| Permanent `OPERATOR_TOKEN` / `OPERATOR_TEST_TOKEN` | **NONE** |

## Stripe LIVE webhook

| Field | Value |
|-------|-------|
| Endpoint ID | `we_1UCd3VBrD4jBSa7EytGxbEBz` |
| URL | `https://st-lucia-bookings-prod.dark-violet-8d91.workers.dev/api/stripe/webhook` |
| Status | enabled · livemode |
| Events | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, `charge.refunded`, `refund.updated` |

Martinique / Barbados / Cadiz / Corfu / Portofino / Villefranche / TEST webhooks were not altered.

## Email config (send gate OFF)

- FROM: `St Lucia Shore Excursions <bookings@notifications.wowatour.com>`
- REPLY-TO: `hello@stluciashoreexcursions.com`
- `EMAIL_SENDING_ENABLED=false` — no production lifecycle email sent in 12F

## Locked probes

- Public checkout → `BOOKINGS_DISABLED` (no live Checkout Session)
- Unsigned webhook → `LIVE_PAYMENTS_BLOCKED` (code flag)
- Operator header confirm → `OPERATOR_FORBIDDEN` (live mode rejects header auth)
- Site book routes: `PRODUCTION_READY_LOCKED` / checkout locked UI

## Product / payment audit (static)

| Product | Price (cents) | Passenger rule | Max | Cancellation |
|---------|---------------|----------------|-----|--------------|
| Soufrière | 15200 | Adult only; child/infant not sold online | 10 | Free ≤14 days |
| Catamaran | 14900 | Ages 4+; infant 0–3 free (0); infant-only rejected | 10 | Free ≤14 days |
| Pitons Views | 8100 | Adult only; child/infant not sold online | 10 | Free ≤14 days |

- Payment success state: `requested` / `paid` — **never** auto-confirmed
- Unable to confirm → decline + full refund (architecture; not executed on PROD)
- Stripe Checkout (future LIVE): USD · server-authoritative pricing · `payment_method_types: ["card"]` · `wallet_options.link.display="never"` (session-level)
- Operator: booking-scoped single-use hashed review tokens only
- Fulfilment: `SEG_MANUAL` / internal codes / net UNKNOWN — **internal notes only**; no public SEG leak

## Safety evidence

- Automated tests: **56/56 PASS**
- Public SEG / internal-code leak: **NONE**
- Secrets in git: **NONE**
- Real-money charge / live Checkout Session / SEG booking / prod refund / fake prod booking: **NONE**
- www DNS / schedules / CT-2 / other destinations: **untouched**

## Recommended next

**PHASE 12G — EXPLICIT LIVE UNLOCK** (only when Graham authorises flipping the three gates and accepting first live traffic).
