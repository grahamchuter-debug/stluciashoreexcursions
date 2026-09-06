# Phase 12D — Request-to-book (St Lucia)

Status: **BUILT — D1 QUOTA + MANUAL CONFIGURATION REQUIRED** before TEST proof (12E).

## What was shipped

- Shared bookings Worker source (`st-lucia-bookings-test` / `st-lucia-bookings-prod`) + D1 migrations
- Product-config driven three tours (Soufrière / Catamaran / Pitons Views)
- Site book journeys at `/book/{slug}/` + `/received/`
- Public product pages rewritten with pricing + Book now CTAs (URLs preserved)
- Terms aligned with 14-day cancellation / unable-to-confirm refund
- Live kill switch: `LIVE_PAYMENTS_CODE_ENABLED = false` + prod `BOOKINGS_ENABLED=false` + `EMAIL_SENDING_ENABLED=false` + public `PRODUCTION_READY_LOCKED`
- Automated tests: **56/56 pass**

## Infrastructure status

| Resource | Value |
|----------|-------|
| Test Worker | `st-lucia-bookings-test` — **pending deploy** (needs D1) |
| Prod Worker | `st-lucia-bookings-prod` — **pending deploy** (needs D1; will stay LOCKED) |
| Test D1 | `st-lucia-bookings-test` — **blocked: account at D1 free-plan limit (10/10)** |
| Prod D1 | `st-lucia-bookings-prod` — **blocked: same** |
| Booking refs | `W2SLE-…` |
| Unlock phrase | `ST_LUCIA_LIVE_UNLOCK` (unused while code flag false) |

Existing D1 databases on the account (do not delete without Graham OK):
Martinique ×2, Barbados ×2, Cadiz ×2, Corfu ×2, Portofino ×1, Villefranche ×1.

### Graham — free 2 D1 slots OR upgrade Workers plan

Then from repo root:

```bash
cd /Users/graham.chuter/Desktop/Caribbean-World-2.0/stluciashoreexcursions
npx wrangler d1 create st-lucia-bookings-test
npx wrangler d1 create st-lucia-bookings-prod
# paste the two database_id values into:
#   workers/bookings/wrangler.jsonc
#   workers/bookings/wrangler.prod.jsonc
npm run bookings:migrate:test
npm run bookings:migrate:prod
npm run bookings:deploy:test
npm run bookings:deploy:prod   # remains BOOKINGS_ENABLED=false / EMAIL_SENDING_ENABLED=false
```

Update `OPERATOR_PORTAL_BASE_URL` in both wrangler configs to the real `*.workers.dev` URLs after first deploy if the subdomain differs.

## Graham — secrets for Phase 12E TEST proof (do not paste in chat)

Do **not** reuse Martinique / Barbados webhook endpoints or D1 IDs.

### 1) Stripe TEST webhook + secret

1. Stripe Dashboard → **TEST mode**
2. Developers → Webhooks → Add endpoint  
   `https://st-lucia-bookings-test.<account>.workers.dev/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `refund.updated`
4. Put secrets on TEST Worker only:

```bash
npx wrangler secret put STRIPE_SECRET_KEY --config workers/bookings/wrangler.jsonc
# sk_test_… only

npx wrangler secret put STRIPE_WEBHOOK_SECRET --config workers/bookings/wrangler.jsonc
# whsec_… for TEST endpoint only

npx wrangler secret put OPERATOR_TEST_TOKEN --config workers/bookings/wrangler.jsonc
# long random token (TEST header ops only)
```

### 2) Resend

From / From name / Reply-To already in Worker vars:

- From: `bookings@notifications.wowatour.com`
- From name: `St Lucia Shore Excursions`
- Reply-To: `hello@stluciashoreexcursions.com`

```bash
npx wrangler secret put RESEND_API_KEY --config workers/bookings/wrangler.jsonc
```

Optional TEST proof only: `EMAIL_SENDING_ENABLED=true` + `TEST_ONLY_EMAIL_OVERRIDE` → `info@wowatour.com`, then disable after proof.

### 3) LIVE secrets — only after TEST proof + Graham authorisation

Do not put `sk_live_` on TEST. Prod Worker stays locked for 12D/12E until explicit unlock.

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

**PHASE 12E — TEST CONFIGURATION / PROOF** after D1 create + TEST secrets.
