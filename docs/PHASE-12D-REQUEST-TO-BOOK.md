# Phase 12D — Request-to-book (St Lucia)

Status: **12D COMPLETE / 12E IN PROGRESS** — D1 + Workers deployed; TEST Stripe + operator secrets set; **blocked on `RESEND_API_KEY`** for sandbox email proof.

## What was shipped (12D)

- Shared bookings Worker source (`st-lucia-bookings-test` / `st-lucia-bookings-prod`) + D1 migrations
- Product-config driven three tours (Soufrière / Catamaran / Pitons Views)
- Site book journeys at `/book/{slug}/` + `/received/`
- Public product pages rewritten with pricing + Book now CTAs (URLs preserved)
- Terms aligned with 14-day cancellation / unable-to-confirm refund
- Live kill switch: `LIVE_PAYMENTS_CODE_ENABLED = false` + prod `BOOKINGS_ENABLED=false` + `EMAIL_SENDING_ENABLED=false` + public `PRODUCTION_READY_LOCKED`
- Automated tests: **56/56 pass**

## Infrastructure status (12E progress)

| Resource | Value |
|----------|-------|
| Test Worker | `https://st-lucia-bookings-test.dark-violet-8d91.workers.dev` — deployed |
| Prod Worker | `https://st-lucia-bookings-prod.dark-violet-8d91.workers.dev` — deployed LOCKED |
| Test D1 | `st-lucia-bookings-test` · `80060780-3b5b-4204-9ca4-703e76de640e` · migrations applied |
| Prod D1 | `st-lucia-bookings-prod` · `46895870-4a35-456c-a873-2d187a80b363` · migrations applied |
| Stripe TEST webhook | `we_1UCcdVBrD4jBSa7EjVzayXHw` → TEST Worker `/api/stripe/webhook` |
| TEST secrets set | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPERATOR_TEST_TOKEN` |
| TEST secret missing | `RESEND_API_KEY` (required to finish sandbox email proof) |
| PROD secrets | none (correct) |
| Booking refs | `W2SLE-…` |
| Unlock phrase | `ST_LUCIA_LIVE_UNLOCK` (unused while code flag false) |

Existing D1 databases on the account remain untouched:
Martinique ×2, Barbados ×2, Cadiz ×2, Corfu ×2, Portofino ×1, Villefranche ×1, plus new St Lucia ×2.

## Graham — remaining for Phase 12E sandbox proof (do not paste in chat)

```bash
cd /Users/graham.chuter/Desktop/Caribbean-World-2.0/stluciashoreexcursions
npx wrangler secret put RESEND_API_KEY --config workers/bookings/wrangler.jsonc
```

Then agent (or Graham) temporarily enables TEST email for proof only:

- `EMAIL_SENDING_ENABLED=true` on TEST Worker vars
- `TEST_ONLY_EMAIL_OVERRIDE` → `info@wowatour.com` (TEST mode only)

From / From name / Reply-To already in Worker vars:

- From: `bookings@notifications.wowatour.com`
- From name: `St Lucia Shore Excursions`
- Reply-To: `hello@stluciashoreexcursions.com`

Do **not** put live Stripe secrets on TEST. Prod stays locked until explicit unlock.

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

**PHASE 12E — finish sandbox proof** after `RESEND_API_KEY` is set on TEST Worker.
