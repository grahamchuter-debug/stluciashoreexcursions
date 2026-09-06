import type { BookableProductConfig, BookableWindow, BookingCruiseContext, BookingCustomer } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DateValidation =
  | { ok: true; inSchedule: boolean; warning?: string }
  | { ok: false; code: "INVALID_DATE" | "PAST_DATE" | "OUTSIDE_WINDOW"; message: string };

export function todayIsoLocal(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateBookingDate(
  date: string,
  window: BookableWindow,
  scheduleDates: ReadonlySet<string>,
  now = new Date(),
): DateValidation {
  if (!ISO_DATE.test(date)) {
    return { ok: false, code: "INVALID_DATE", message: "Enter a valid date." };
  }
  const today = todayIsoLocal(now);
  if (date < today) {
    return { ok: false, code: "PAST_DATE", message: "Please choose today or a future cruise date." };
  }
  if (date < window.start || date > window.end) {
    return {
      ok: false,
      code: "OUTSIDE_WINDOW",
      message: `We can take requests between ${window.start} and ${window.end}.`,
    };
  }
  if (!scheduleDates.has(date)) {
    return {
      ok: true,
      inSchedule: false,
      warning:
        "We don't have a published ship call for this date yet. You can still send a request — tell us your ship so we can arrange your excursion.",
    };
  }
  return { ok: true, inSchedule: true };
}

export function validateCustomer(customer: BookingCustomer): string | null {
  if (!customer.name.trim() || customer.name.trim().length < 2) {
    return "Please enter the lead passenger's name.";
  }
  if (!EMAIL.test(customer.email.trim())) {
    return "Please enter a valid email address.";
  }
  if (!customer.phone.trim() || customer.phone.replace(/\s/g, "").length < 8) {
    return "Please enter a mobile or WhatsApp number so we can reach you about this request.";
  }
  return null;
}

export function validateCruise(cruise: BookingCruiseContext): string | null {
  if (!ISO_DATE.test(cruise.date)) return "Choose your cruise date.";
  if (!cruise.shipName.trim()) return "Tell us which ship you are arriving on.";
  return null;
}

export function shipRequired(shipsForDate: number, scheduleMatched: boolean): boolean {
  if (!scheduleMatched) return true;
  return shipsForDate !== 1;
}

export function isProductRequestable(product: BookableProductConfig): boolean {
  return product.bookingMode === "request" && product.availability === "live";
}
