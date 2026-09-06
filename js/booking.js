/**
 * St Lucia request-to-book form (Phase 12D).
 * Server-side pricing is authoritative — client total is for review only.
 */
(function () {
  const form = document.getElementById("sl-booking-form");
  if (!form || !window.SL_COMMERCIAL) return;

  const cfg = window.SL_COMMERCIAL;
  const productId = form.dataset.productId || "";
  const product = cfg.products[productId];
  if (!product) return;

  const adultRate = Number(product.adultUsd || 0);
  const infantRate = product.infantUsd == null ? null : Number(product.infantUsd);
  const max = Number(product.maxGuests || 10);
  const guestModel = product.guestModel || "adult_only";
  const status = product.publicBookingStatus || cfg.defaultPublicBookingStatus;
  const live = status === "BOOKING_ENABLED";
  const apiUrl = String(cfg.bookingsApiUrl || "").replace(/\/$/, "");
  const errEl = document.getElementById("booking-error");
  const submitBtn = document.getElementById("booking-submit");
  const lockedBtn = document.getElementById("booking-submit-locked");
  const ackEl = document.getElementById("booking_ack");

  form.dataset.live = live ? "1" : "0";
  const statusTitle = document.getElementById("booking-status-title");
  const statusBody = document.getElementById("booking-status-body");
  const footerNote = document.getElementById("booking-footer-note");

  function setControlVisible(el, visible) {
    if (!el) return;
    el.hidden = !visible;
    el.classList.toggle("hidden", !visible);
    el.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) el.style.display = "none";
    else el.style.removeProperty("display");
  }

  if (live) {
    if (lockedBtn) lockedBtn.remove();
    setControlVisible(submitBtn, true);
    if (ackEl) ackEl.disabled = false;
    if (statusTitle) statusTitle.textContent = "Book with confidence";
    if (statusBody) {
      statusBody.textContent =
        "Pay securely online to request your excursion. We'll confirm your places separately by email. If we're unable to confirm your excursion, you'll receive a full refund.";
    }
    if (footerNote) {
      footerNote.innerHTML =
        'Secure card payment via Stripe. Prefer to ask first? <a href="mailto:' +
        cfg.email +
        '">' +
        cfg.email +
        "</a>";
    }
  } else {
    setControlVisible(lockedBtn, true);
    setControlVisible(submitBtn, false);
    if (ackEl) ackEl.disabled = true;
    if (statusTitle) statusTitle.textContent = "Online checkout is prepared and locked.";
    if (statusBody) {
      statusBody.textContent =
        "Payment receives your request — it does not confirm the excursion. Confirmation is emailed after we arrange your places. If we cannot confirm, the payment is refunded in full to your original payment method. Live card payments are not enabled yet.";
    }
    if (footerNote) {
      footerNote.innerHTML =
        'Live payments remain locked on this product. Prefer to ask first? <a href="mailto:' +
        cfg.email +
        '">' +
        cfg.email +
        "</a>";
    }
  }

  function num(id, fallback) {
    const el = document.getElementById(id);
    return el ? Math.max(0, parseInt(el.value || String(fallback), 10) || 0) : fallback;
  }

  function refresh() {
    const adults = num("adults", 1);
    const infants = guestModel === "ages4_plus_infant" ? num("infants", 0) : 0;
    const dateEl = document.getElementById("cruise_date");
    const shipEl = document.getElementById("ship_name");
    const set = (id, text) => {
      const n = document.getElementById(id);
      if (n) n.textContent = text;
    };
    set("rev-date", dateEl && dateEl.value ? dateEl.value : "—");
    set("rev-ship", shipEl && shipEl.value.trim() ? shipEl.value.trim() : "—");
    set("rev-adults", adults + " × $" + adultRate);
    const infantsRow = document.getElementById("rev-infants-row");
    if (guestModel === "ages4_plus_infant") {
      if (infantsRow) infantsRow.hidden = false;
      set("rev-infants", infants + " × $0");
    } else if (infantsRow) {
      infantsRow.hidden = true;
    }
    const totalGuests = adults + infants;
    const total = adults * adultRate + (infantRate == null ? 0 : infants * infantRate);
    if (totalGuests > max) set("rev-total", "Too many guests (max " + max + ")");
    else set("rev-total", "USD $" + total);
    return { adults, infants, totalGuests, totalCents: Math.round(total * 100) };
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function sessionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "sl-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  const cruiseDateInput = document.getElementById("cruise_date");
  if (cruiseDateInput) {
    const dateField = cruiseDateInput.closest("label") || cruiseDateInput;
    dateField.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      try {
        if (typeof cruiseDateInput.showPicker === "function") cruiseDateInput.showPicker();
      } catch (_) {
        /* ignore */
      }
    });
  }

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  refresh();

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    showError("");
    if (!live || !apiUrl || !productId) {
      showError("Online checkout is prepared and locked. Live payment is not open yet. Email " + cfg.email + " if you need help.");
      return;
    }

    const adults = num("adults", 1);
    const infants = guestModel === "ages4_plus_infant" ? num("infants", 0) : 0;
    const totalGuests = adults + infants;
    if (adults < 1) {
      showError(
        guestModel === "ages4_plus_infant"
          ? "Please include at least one paying guest aged 4+ as the booking lead."
          : "Please include at least one adult.",
      );
      return;
    }
    if (totalGuests < 1 || totalGuests > max) {
      showError("Please choose between 1 and " + max + " guests.");
      return;
    }

    const cruiseDate = (document.getElementById("cruise_date") || {}).value || "";
    const shipName = ((document.getElementById("ship_name") || {}).value || "").trim();
    const name = ((document.getElementById("lead_name") || {}).value || "").trim();
    const email = ((document.getElementById("lead_email") || {}).value || "").trim();
    const phone = ((document.getElementById("lead_phone") || {}).value || "").trim();
    const mobility = ((document.getElementById("mobility") || {}).value || "").trim();
    const special = ((document.getElementById("special_requirements") || {}).value || "").trim();
    const ackBox = document.getElementById("booking_ack");

    if (!cruiseDate || !shipName || !name || !email || !phone) {
      showError("Please complete date, ship, and lead passenger details.");
      return;
    }
    if (!ackBox || !ackBox.checked) {
      showError("Please acknowledge that payment receives a request, not confirmation.");
      return;
    }

    const notes = [];
    if (mobility) notes.push("Mobility: " + mobility);
    if (special) notes.push("Special requirements: " + special);

    const totalCents = Math.round(adults * adultRate * 100 + (infantRate == null ? 0 : infants * infantRate * 100));
    const payload = {
      productId: product.productId,
      bookingSessionId: sessionId(),
      guests: { adults: adults, children: 0, infants: infants },
      customer: {
        name: name,
        email: email,
        phone: phone,
        operationalNotes: notes.length ? notes.join(" | ") : undefined,
      },
      cruise: {
        date: cruiseDate,
        shipName: shipName,
        shipSlug: "not-listed",
        cruiseLine: "",
        isCustomShip: true,
        scheduleMatched: false,
      },
      confirmationAcknowledged: true,
      clientDisplayedTotalCents: totalCents,
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Connecting to secure checkout…";
    }

    try {
      const res = await fetch(apiUrl + "/api/bookings/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || !data.ok) {
        showError((data && data.message) || "Checkout could not start. No payment was taken.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & request";
        }
        return;
      }
      const checkoutUrl = data.checkoutUrl || data.url;
      if (!checkoutUrl) {
        showError("Checkout URL missing. No payment was taken.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pay & request";
        }
        return;
      }
      window.location.assign(checkoutUrl);
    } catch (_) {
      showError("Network error starting checkout. No payment was taken.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Pay & request";
      }
    }
  });
})();
