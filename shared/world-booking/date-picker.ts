/** Feature-detect native `HTMLInputElement.showPicker()` (Chromium, Safari 16+). */
export function inputSupportsShowPicker(input: HTMLInputElement): boolean {
  return typeof input.showPicker === "function";
}

export type OpenNativeDatePickerOptions = {
  /**
   * When true (default), fall back to `input.click()` if showPicker is missing
   * or throws. Set false when already handling a click/pointerdown on the input
   * itself to avoid recursive click handlers.
   */
  clickFallback?: boolean;
};

/**
 * Focus the native date input and open its picker when the browser allows.
 * Safe fallback: focus + programmatic click (no throw if showPicker is missing).
 */
export function openNativeDatePicker(
  input: HTMLInputElement,
  options: OpenNativeDatePickerOptions = {},
): void {
  const clickFallback = options.clickFallback !== false;
  input.focus({ preventScroll: true });
  if (inputSupportsShowPicker(input)) {
    try {
      input.showPicker();
      return;
    } catch {
      // Already open, unsupported state, or non-user-gesture — fall through.
    }
  }
  if (clickFallback) input.click();
}
