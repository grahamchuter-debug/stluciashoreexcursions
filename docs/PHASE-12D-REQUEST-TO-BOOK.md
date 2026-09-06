# Phase 12D — Request-to-book (St Lucia)

Status: **12D COMPLETE / 12E COMPLETE** — sandbox proven; production remains locked.

## What was shipped (12D)

- Shared bookings Worker source (`st-lucia-bookings-test` / `st-lucia-bookings-prod`) + D1 migrations
- Product-config driven three tours (Soufrière / Catamaran / Pitons Views)
- Site book journeys at `/book/{slug}/` + `/received/`
- Public product pages rewritten with pricing + Book now CTAs (URLs preserved)
- Terms aligned with 14-day cancellation / unable-to-confirm refund
- Live kill switch: `LIVE_PAYMENTS_CODE_ENABLED = false` + prod `BOOKINGS_ENABLED=false` + `EMAIL_SENDING_ENABLED=false` + public `PRODUCTION_READY_LOCKED`
- Automated tests: **56/56 pass**

## Infrastructure status (12E)

| Resource | Value |
|----------|-------|
| Test Worker | `https://st-lucia-bookings-test.dark-violet-8d91.workers.dev` — deployed |
| Prod Worker | `https://st-lucia-bookings-prod.dark-violet-8d91.workers.dev` — deployed LOCKED |
| Test D1 | `st-lucia-bookings-test` · `80060780-3b5b-4204-9ca4-703e76de640e` · migrations applied |
| Prod D1 | `st-lucia-bookings-prod` · `46895870-4a35-456c-a873-2d187a80b363` · migrations applied |
| Stripe TEST webhook | St Lucia TEST Worker `/api/stripe/webhook` (dedicated endpoint) |
| TEST secrets | Stripe TEST + webhook + operator + Resend (+ temporary email override during proof) |
| PROD secrets | none (correct) |
| Booking refs | `W2SLE-…` |
| Unlock phrase | `ST_LUCIA_LIVE_UNLOCK` (unused while code flag false) |

See `docs/PHASE-12E-TEST-PROOF.md` for sandbox references and operator confirm/decline proofs.

Existing D1 databases on the account remain untouched:
Martinique ×2, Barbados ×2, Cadiz ×2, Corfu ×2, Portofino ×1, Villefranche ×1, plus St Lucia ×2.

## Safety already enforced

- Payment ≠ confirmation (`requested` + `paid`)
- Server-side pricing (152 / 149+infant0 / 81)
- Online max 10; min 1 adult / paying lead
- Stripe Link disabled session-level (`payment_method_types: card` + `wallet_options.link.display=never`)
- Internal `SEG_MANUAL` / codes never on public HTML/JS
- Private Tours editorial only (no Book now)
- CT-2 / schedules / other destinations / www DNS untouched
- Prod gates locked

## Recommended next

**PHASE 12F — PRODUCTION READINESS / LIVE SECRET CONFIGURATION, STILL LOCKED**

