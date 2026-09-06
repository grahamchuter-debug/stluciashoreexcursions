/**
 * Received-page helper — shows booking reference when present and valid.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const ref = (params.get("ref") || "").trim();
  const el = document.getElementById("booking-ref");
  const wrap = document.getElementById("booking-ref-wrap");
  if (!el || !wrap) return;
  if (/^W2SLE-[A-Z0-9]+$/i.test(ref)) {
    el.textContent = ref.toUpperCase();
    wrap.hidden = false;
  }
})();
