# Phase 12D — Request-to-book (St Lucia)

Status: **BUILT — PRODUCTION LOCKED** · awaiting Phase 12E TEST configuration / proof.

## What was shipped

- Shared bookings Worker (`st-lucia-bookings-test` / `st-lucia-bookings-prod`) + separate D1
- Three RTB products: Soufrière Volcano & Waterfalls, Catamaran Cruise to Soufrière, Pitons Views
- Site book journeys at `/book/{slug}/` + `/received/`
- Public product pages upgraded with pricing + Book now CTAs (equity `.html` URLs preserved)
- Terms: 14-day free cancel; within 14 days non-refundable; unable-to-confirm full refund
- Production gates locked: `LIVE_PAYMENTS_CODE_ENABLED = false`, prod `BOOKINGS_ENABLED=false`, `EMAIL_SENDING_ENABLED=false`, public `PRODUCTION_READY_LOCKED`

## Infrastructure

| Resource | Value |
|----------|-------|
| Test Worker | `st-lucia-bookings-test` (deploy pending D1 capacity) |
| Prod Worker | `st-lucia-bookings-prod` (deploy pending D1 capacity · LOCKED) |
| Test D1 | `st-lucia-bookings-test` — **not created yet** (account at D1 free-plan limit of 10) |
| Prod D1 | `st-lucia-bookings-prod` — **not created yet** |
| Booking refs | `W2SLE-…` |
| Unlock phrase | `ST_LUCIA_LIVE_UNLOCK` |

### D1 capacity blocker (Phase 12D)

Cloudflare account currently has 10/10 D1 databases (Martinique, Barbados, Cadiz, Corfu, Portofino, Villefranche). Creating `st-lucia-bookings-test` / `st-lucia-bookings-prod` failed with the free-plan limit.

**Graham before 12E:** free two unused D1 slots **or** upgrade Workers, then:

```bash
cd /Users/graham.chuter/Desktop/Caribbean-World-2.0/stluciashoreexcursions
npx wrangler d1 create st-lucia-bookings-test
npx wrangler d1 create st-lucia-bookings-prod
# paste database_id into workers/bookings/wrangler.jsonc and wrangler.prod.jsonc
npm run bookings:migrate:test
npm run bookings:migrate:prod
npm run bookings:deploy:test
npm run bookings:deploy:prod
```

Do **not** delete Martinique / Barbados / other live destination D1 without explicit authorisation.

## Graham — secrets for Phase 12E TEST proof (do not paste in chat)

```bash
cd /Users/graham.chuter/Desktop/Caribbean-World-2.0/stluciashoreexcursions

# Stripe TEST webhook endpoint:
# https://st-lucia-bookings-test.<subdomain>.workers.dev/api/stripe/webhook
# Events: checkout.session.completed, checkout.session.async_payment_succeeded,
# checkout.session.async_payment_failed, payment_intent.payment_failed,
# charge.refunded, refund.updated

npx wrangler secret put STRIPE_SECRET_KEY --config workers/bookings/wrangler.jsonc
# sk_test_… only

npx wrangler secret put STRIPE_WEBHOOK_SECRET --config workers/bookings/wrangler.jsonc
# whsec_… for TEST endpoint only

npx wrangler secret put RESEND_API_KEY --config workers/bookings/wrangler.jsonc
# re_… (notifications.wowatour.com)

npx wrangler secret put OPERATOR_TEST_TOKEN --config workers/bookings/wrangler.jsonc
# long random token (TEST header ops only)
```

Email From (already in Worker vars): `St Lucia Shore Excursions <bookings@notifications.wowatour.com>`  
Reply-To: `hello@stluciashoreexcursions.com`

**Do not** put `sk_live_` on TEST. **Do not** enable prod live payments in 12D/12E without explicit unlock.

## Safety already enforced

- Payment ≠ confirmation (`requested` / `paid`)
- Server-side pricing; Stripe Link disabled session-level (`payment_method_types: card`, `wallet_options.link.display: never`)
- Online max 10; adult / ages-4+ lead required
- Internal `SEG_MANUAL` / product codes never on public HTML/JS
- Private tours editorial only (no Book now)
- CT-2 / schedules / www DNS / other destinations untouched
