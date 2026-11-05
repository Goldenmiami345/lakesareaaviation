import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { openTrafficCard, trafficCardIsOpen, subscribeTrafficCard } from "./traffic-card-open";

describe("airplane info card open state", () => {
  it("starts closed", () => {
    assert.equal(trafficCardIsOpen(), false);
  });

  it("is open while a card is shown and closed once it goes away", () => {
    const close = openTrafficCard();
    assert.equal(trafficCardIsOpen(), true);
    close();
    assert.equal(trafficCardIsOpen(), false);
  });

  it("stays open while another card is still up", () => {
    const a = openTrafficCard();
    const b = openTrafficCard();
    a();
    assert.equal(trafficCardIsOpen(), true);
    b();
    assert.equal(trafficCardIsOpen(), false);
  });

  it("tells subscribers only while the state changes", () => {
    let n = 0;
    const off = subscribeTrafficCard(() => {
      n += 1;
    });
    const close = openTrafficCard();
    assert.equal(n, 1);
    close();
    assert.equal(n, 2);
    off();
    const close2 = openTrafficCard();
    assert.equal(n, 2);
    close2();
  });
});

import { trafficCardRecentlyOpen } from "./traffic-card-open";
it("a card put away just now still counts, so the dismissing tap never flips the stage", () => {
  const close = openTrafficCard();
  close();
  assert.equal(trafficCardRecentlyOpen(700), true);
  assert.equal(trafficCardRecentlyOpen(-1), false);
});
