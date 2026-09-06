# Phase 12G — Explicit live unlock (St Lucia)

Status: **COMPLETE** — live request-to-book enabled. Awaiting Phase 12H controlled real-money proof.

Worker: `st-lucia-bookings-prod` · mode `live` · deployment `30cbb99d-2c41-4aac-b7a3-e220740d3eb3`  
Gates: `LIVE_PAYMENTS_CODE_ENABLED=true` · `BOOKINGS_ENABLED=true` · `EMAIL_SENDING_ENABLED=true`  
Public site: `BOOKING_ENABLED` on all three products · book HTML defaults unlocked

## What changed

| Gate / surface | Value |
|----------------|-------|
| Code flag `LIVE_PAYMENTS_CODE_ENABLED` | `true` |
| Prod Worker `BOOKINGS_ENABLED` | `true` |
| Prod Worker `EMAIL_SENDING_ENABLED` | `true` |
| Public `publicBookingStatus` (3 products) | `BOOKING_ENABLED` |

## Safe checkout proof (unpaid only)

| Field | Value |
|-------|-------|
| Session created | YES (one LIVE Checkout Session) |
| Reference | `W2SLE-36M37F7U` |
| D1 / Stripe state | `payment_pending` / `unpaid` · session `open` |
| Charge | NONE (`payment_intent` null) |
| Lifecycle email | NONE (email outbox 0) |
| SEG | NONE |

## Unchanged / out of scope

- Product prices, passenger rules, cancellation (14-day free window)
- Payment success state remains `requested` / `paid` — never auto-confirmed
- Operator auth: booking-scoped hashed single-use review tokens only (no permanent prod header token)
- www DNS / MX / TXT / schedules / CT-2 / other destinations
- No real-money charge completed in 12G (deferred to 12H)

## Email (send gate ON)

- FROM: `St Lucia Shore Excursions <bookings@notifications.wowatour.com>`
- REPLY-TO: `hello@stluciashoreexcursions.com`
- No synthetic lifecycle emails were sent in this phase

## Stripe LIVE

- Currency: USD · server-authoritative amounts · `payment_method_types: ["card"]`
- Session-level `wallet_options.link.display="never"`
- Webhook `we_1UCd3VBrD4jBSa7EytGxbEBz` unchanged (6 events)

## Recommended next

**PHASE 12H — ONE CONTROLLED REAL-MONEY BOOKING + FULL REFUND PROOF**
