# Phase 12E — Controlled Stripe TEST proof (St Lucia)

Status: **COMPLETE** — TEST lifecycle proven. Live payments remain locked.

Worker: `st-lucia-bookings-test` · mode `test` · live key absent on TEST  
Prod: `st-lucia-bookings-prod` · `BOOKINGS_ENABLED=false` · `EMAIL_SENDING_ENABLED=false` · no secrets · `LIVE_PAYMENTS_CODE_ENABLED=false`

## D1

| Env | Name | UUID |
|-----|------|------|
| TEST | `st-lucia-bookings-test` | `80060780-3b5b-4204-9ca4-703e76de640e` |
| PROD | `st-lucia-bookings-prod` | `46895870-4a35-456c-a873-2d187a80b363` |

Migrations `0001`–`0003` applied to both. Existing destination D1 databases untouched.

## Checkout / payment proofs (TEST card 4242)

| Case | Ref | Amount | D1 after pay |
|------|-----|--------|--------------|
| Soufrière 1 adult | W2SLE-WUJ2U7K7 | USD 15200 | requested / paid |
| Catamaran 1× ages 4+ | W2SLE-MBS3VHNL | USD 14900 | requested / paid |
| Pitons Views 1 adult | W2SLE-SQKVT7HC | USD 8100 | requested / paid |

Catamaran infant price: 1 paying + 1 infant 0–3 Checkout Session amount still USD 14900 (session then expired unused). Infant-only rejected (`PRICE`).

Webhook: `checkout.session.completed` once per paid booking. Emails during proof: `customer_requested` + `ops_request` sent once each (TEST email temporarily enabled + `TEST_ONLY_EMAIL_OVERRIDE` → `info@wowatour.com`).

Stripe Link: session `payment_method_types: ["card"]` + `wallet_options.link.display=never`; Link not presented on hosted Checkout. Apple Pay: wallet affordance observed in Checkout UI (report-only; no account-wide change).

## Operator (TEST header token only)

- Confirm W2SLE-WUJ2U7K7 → `confirmed` / paid · `customer_confirmed` sent once · no refund · duplicate confirm `duplicate:true`
- Decline W2SLE-MBS3VHNL → full Stripe TEST refund · `supplier_declined` / `refunded` · `customer_declined` sent once · `charge.refunded` + `refund.updated` · duplicate decline safe

Pitons W2SLE-SQKVT7HC left `requested` / `paid` (no auto-confirm).

## Failures / validation (live TEST Worker)

Rejected: Soufrière/Pitons child & infant, catamaran infant-only, >10 guests, missing consent, invalid email, price tamper, unknown product, invalid webhook signature, missing/wrong operator auth.

Automated suite: **56/56 pass**. Public SEG leak scan: **NONE**.

## Safety left after proof

- TEST: `EMAIL_SENDING_ENABLED=false` (redeployed) · bookings remain enabled for further TEST · secrets retained
- Prod unchanged / locked · site `PRODUCTION_READY_LOCKED` · no CT-2 / schedules / other destination / www DNS changes

## Recommended next

**PHASE 12F — PRODUCTION READINESS / LIVE SECRET CONFIGURATION, STILL LOCKED**
