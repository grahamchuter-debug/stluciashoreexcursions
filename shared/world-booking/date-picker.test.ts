import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inputSupportsShowPicker, openNativeDatePicker } from "./date-picker";

describe("openNativeDatePicker", () => {
  it("feature-detects showPicker", () => {
    const without = { focus() {}, click() {} } as HTMLInputElement;
    assert.equal(inputSupportsShowPicker(without), false);

    const withPicker = {
      focus() {},
      click() {},
      showPicker() {},
    } as HTMLInputElement;
    assert.equal(inputSupportsShowPicker(withPicker), true);
  });

  it("focuses and calls showPicker when available", () => {
    let focused = false;
    let picked = false;
    let clicked = false;
    const input = {
      focus() {
        focused = true;
      },
      click() {
        clicked = true;
      },
      showPicker() {
        picked = true;
      },
    } as HTMLInputElement;

    openNativeDatePicker(input);
    assert.equal(focused, true);
    assert.equal(picked, true);
    assert.equal(clicked, false);
  });

  it("falls back to click when showPicker throws", () => {
    let clicked = false;
    const input = {
      focus() {},
      click() {
        clicked = true;
      },
      showPicker() {
        throw new DOMException("Not allowed", "NotAllowedError");
      },
    } as HTMLInputElement;

    openNativeDatePicker(input);
    assert.equal(clicked, true);
  });

  it("falls back to click when showPicker is unavailable", () => {
    let clicked = false;
    const input = {
      focus() {},
      click() {
        clicked = true;
      },
    } as HTMLInputElement;

    openNativeDatePicker(input);
    assert.equal(clicked, true);
  });

  it("skips click fallback when clickFallback is false", () => {
    let clicked = false;
    const input = {
      focus() {},
      click() {
        clicked = true;
      },
    } as HTMLInputElement;

    openNativeDatePicker(input, { clickFallback: false });
    assert.equal(clicked, false);
  });
});
