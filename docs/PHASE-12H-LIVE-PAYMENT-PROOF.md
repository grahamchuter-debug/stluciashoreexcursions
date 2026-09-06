# Phase 12H — Live payment proof / final close-out (St Lucia)

Status: **COMPLETE** — controlled LIVE payment proven; commercial freeze.

Worker: `st-lucia-bookings-prod` · mode `live`  
Gates: `LIVE_PAYMENTS_CODE_ENABLED=true` · `BOOKINGS_ENABLED=true` · `EMAIL_SENDING_ENABLED=true`  
PROD D1: `st-lucia-bookings-prod` · `46895870-4a35-456c-a873-2d187a80b363`  
Stripe LIVE webhook: `we_1UCd3VBrD4jBSa7EytGxbEBz` (unchanged)

## Controlled live booking (Graham — already paid)

| Field | Value |
|-------|-------|
| Reference | `W2SLE-UZBXD9VG` |
| Product | Pitons Views Tour (`pitons-views-tour`) |
| Amount | USD **8100** cents ($81.00) |
| D1 booking state | `requested` |
| D1 payment state | `paid` |
| Stripe | LIVE · PaymentIntent `succeeded` · amount 8100 · currency `usd` |
| Refund | **NONE** (`amount_refunded=0`, refund list empty) — **NO REFUND BY DESIGN** |
| Webhook | `checkout.session.completed` processed **once** · no duplicate lifecycle mutation |
| Auto-confirm | **NO** — remains `requested` / `paid` |
| Email outbox | `customer_requested` ×1 · `ops_request` ×1 · no `customer_confirmed` / `customer_declined` |
| Operator review | Booking-scoped hashed single-use token present · **not consumed** · audit empty · **no confirm/decline/refund** |
| SEG booking | **NONE** |

## Design decision

- **Do not refund** this live proof payment.
- **Do not place** an SEG / supplier booking for this reference.
- Leave the booking **requested / paid** for operator handling outside this phase freeze.

## Unchanged / out of scope

- No additional Checkout Session or real-money charge created by this phase
- No production D1 mutation by this phase (read-only verification only)
- No email resend · no webhook replay · no operator token exposure
- No permanent prod `OPERATOR_TOKEN` / `OPERATOR_TEST_TOKEN` secret
- No secrets / PII / review tokens recorded in git
- No public SEG / internal supply leak
- CT-2 · schedules · www DNS · TEST Worker · other destinations untouched
- Visual QA Phase **12G.1** accepted **GREEN** (no further visual changes)

## Automated tests

`npm run test:booking` → **56/56 PASS**

## Freeze

**PHASE 12H COMPLETE — LIVE PAYMENT PROVEN / EMAIL PROVEN / REQUESTED-PAID STATE PROVEN / NO REFUND BY DESIGN / COMMERCIAL COMPLETE / FREEZE**
