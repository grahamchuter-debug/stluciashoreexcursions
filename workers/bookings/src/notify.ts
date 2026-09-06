import { stLuciaBookingCore } from "../../../shared/destinations/st-lucia";
import { findStLuciaBookingProduct } from "../../../shared/destinations/st-lucia-products";
import {
  confirmedCustomerEmail,
  declinedCustomerEmail,
  destinationBrandFromCore,
  renderCustomerBookingEmailHtml,
  renderCustomerBookingEmailText,
  renderOpsRequestEmailHtml,
  renderOpsRequestEmailText,
  requestedCustomerEmail,
  supplierRequestEmail,
  supplierRoutingIsPlaceholder,
} from "../../../shared/world-booking";
import type { BookingRow } from "./db";
import { enqueueEmailOutbox } from "./db";
import { deliverOutboxForBooking } from "./email";
import { formatMajorMoneyForEmail } from "./logic";
import {
  buildOperatorReviewUrl,
  createOperatorReviewToken,
  operatorPortalBaseUrl,
} from "./operator-tokens";

type NotifyEnv = {
  DB: D1Database;
  OPERATOR_PORTAL_BASE_URL?: string;
  SITE_BASE_URL?: string;
};

const destinationBrand = destinationBrandFromCore(stLuciaBookingCore);

function guestsFromBooking(booking: BookingRow) {
  return {
    adults: booking.adults || booking.guest_count,
    children: booking.children,
    infants: booking.infants,
  };
}

function cruiseFromBooking(booking: BookingRow) {
  return {
    date: booking.cruise_date,
    shipName: booking.ship_name,
    shipSlug: booking.ship_slug || "not-listed",
    cruiseLine: "",
    isCustomShip: booking.ship_slug === "not-listed",
    scheduleMatched: false,
  };
}

/**
 * Enqueue ops + customer request emails after trusted payment fulfilment.
 * Safe to call on webhook retries: unique (reference, kind) prevents duplicates.
 */
export async function enqueuePostPaymentNotifications(env: NotifyEnv, booking: BookingRow): Promise<void> {
  try {
    const product = findStLuciaBookingProduct(booking.product_id);
    if (!product) {
      console.error("ops_alert", { kind: "unknown_product_after_payment", reference: booking.booking_reference });
      return;
    }

    const amountLabel = formatMajorMoneyForEmail(Math.round(booking.amount_total_cents / 100), booking.currency);
    const guests = guestsFromBooking(booking);
    const cruise = cruiseFromBooking(booking);

    const customer = requestedCustomerEmail({
      reference: booking.booking_reference,
      product,
      cruise,
      guests,
      amountLabel,
      customerName: booking.customer_name,
      brand: destinationBrand,
    });
    const insertedCustomer = await enqueueEmailOutbox(env, {
      bookingReference: booking.booking_reference,
      kind: "customer_requested",
      payload: {
        to: booking.customer_email,
        subject: customer.subject,
        heading: customer.customerHeading,
        text: renderCustomerBookingEmailText(customer.shell),
        html: renderCustomerBookingEmailHtml(customer.shell),
      },
    });

    if (supplierRoutingIsPlaceholder(product) || !product.supplier.notificationEmail) {
      console.error("ops_alert", {
        kind: "supplier_routing_unready",
        reference: booking.booking_reference,
        productId: product.id,
        message: "Payment recorded. Operational email was not queued because routing is not production-ready.",
      });
      return;
    }

    let reviewUrl: string | undefined;
    const portalBase = operatorPortalBaseUrl(env);
    if (portalBase) {
      const token = await createOperatorReviewToken(env, booking.booking_reference);
      reviewUrl = buildOperatorReviewUrl(portalBase, booking.booking_reference, token);
    } else {
      console.warn("operator_portal_base_missing", { reference: booking.booking_reference });
    }

    const ops = supplierRequestEmail({
      reference: booking.booking_reference,
      product,
      cruise,
      guests,
      customer: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
      },
      amountLabel,
      operationalNotes: booking.operational_notes ?? undefined,
      reviewUrl,
      destinationLabel: "St Lucia Shore Excursions — new booking request",
    });
    const insertedOps = await enqueueEmailOutbox(env, {
      bookingReference: booking.booking_reference,
      kind: "ops_request",
      payload: {
        to: product.supplier.notificationEmail,
        subject: ops.subject,
        heading: "NEW ST LUCIA BOOKING REQUEST",
        text: renderOpsRequestEmailText(ops.shell),
        html: renderOpsRequestEmailHtml(ops.shell),
      },
    });

    console.info(
      JSON.stringify({
        email_outbox_enqueued: true,
        reference: booking.booking_reference,
        customerRequested: insertedCustomer,
        opsRequest: insertedOps,
        reviewLinkIncluded: Boolean(reviewUrl),
      }),
    );
  } catch (err) {
    console.error("ops_alert", {
      kind: "notification_failed",
      reference: booking.booking_reference,
      error: String(err),
    });
  }
}

export async function enqueueConfirmationEmail(env: NotifyEnv, booking: BookingRow): Promise<void> {
  try {
    const product = findStLuciaBookingProduct(booking.product_id);
    if (!product) return;
    const mail = confirmedCustomerEmail({
      reference: booking.booking_reference,
      product,
      cruise: cruiseFromBooking(booking),
      guests: guestsFromBooking(booking),
      amountLabel: formatMajorMoneyForEmail(Math.round(booking.amount_total_cents / 100), booking.currency),
      customerName: booking.customer_name,
      brand: destinationBrand,
    });
    await enqueueEmailOutbox(env, {
      bookingReference: booking.booking_reference,
      kind: "customer_confirmed",
      payload: {
        to: booking.customer_email,
        subject: mail.subject,
        heading: mail.customerHeading,
        text: renderCustomerBookingEmailText(mail.shell),
        html: renderCustomerBookingEmailHtml(mail.shell),
      },
    });
  } catch (err) {
    console.error("ops_alert", { kind: "confirmation_email_enqueue_failed", error: String(err) });
  }
}

export async function enqueueDeclineEmail(env: NotifyEnv, booking: BookingRow, amountLabel: string): Promise<void> {
  try {
    const product = findStLuciaBookingProduct(booking.product_id);
    if (!product) return;
    const mail = declinedCustomerEmail({
      reference: booking.booking_reference,
      product,
      cruise: cruiseFromBooking(booking),
      guests: guestsFromBooking(booking),
      amountLabel,
      customerName: booking.customer_name,
      refundState: booking.payment_status === "refunded" ? "refunded" : "refund_pending",
      brand: destinationBrand,
    });
    await enqueueEmailOutbox(env, {
      bookingReference: booking.booking_reference,
      kind: "customer_declined",
      payload: {
        to: booking.customer_email,
        subject: mail.subject,
        heading: mail.customerHeading,
        text: renderCustomerBookingEmailText(mail.shell),
        html: renderCustomerBookingEmailHtml(mail.shell),
      },
    });
  } catch (err) {
    console.error("ops_alert", { kind: "decline_email_enqueue_failed", error: String(err) });
  }
}

export { deliverOutboxForBooking };
