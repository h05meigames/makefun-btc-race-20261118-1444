// btc-race-24h-20261118-1444 entry (Node 22, standard library only): a
// mean-reversion dip buyer for Coinbase Wrapped BTC (cbBTC) on 1-minute
// on-chain bars, long only, no leverage, fully deterministic.
//
// Method: the dev window falls 2.8% overall and is choppy rather than
// trending, so momentum chasing loses (the kit's EMA-cross baseline loses
// $148 on it) while sharp drops bounce: after a 10-minute drop of more than
// 50 bps the price rises more than 35 bps over the next hour 73% of the
// time. The bot therefore buys only sharp dips, and only while the
// 240-minute trend is not in freefall:
//
//   enter: 15-bar log return < -40 bps AND 240-bar log return > -50 bps
//   exit:  sell half at +35 bps over the filled cost basis, the rest at
//          +100 bps, hard stop -60 bps, or 120 bars held, whichever first
//   then:  5 bars of cooldown before the next entry
//
// A full-size round trip costs about 26 bps in fee, slippage and impact, so
// the +35 bps first target clears the round-trip cost on the half sold and
// the +100 bps second target is where the bounce usually runs to. Position
// size is the whole cash balance each entry (max_weight_bps is 10000), one
// open position at most. No clock, no environment, no randomness: the same
// bars always produce the same orders.
//
// On the kit's published dev window this rule makes +$9.96 net PnL on 9
// trades (3 round trips, max drawdown 0.39%), verified with the kit's own
// grade-local; every kit baseline loses money on the same window.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Dip window, bars. */
const LOOKBACK_BARS = 15;
/** Enter when the 15-bar log return is below this (bps). */
const DIP_BPS = 40;
/** Long-trend window, bars. */
const REGIME_BARS = 240;
/** Skip entries while the 240-bar log return is at or below this (bps). */
const REGIME_MIN_BPS = -50;
/** Sell half the position at this return over the filled cost basis (bps). */
const TP1_BPS = 35;
/** Sell the rest at this return over the filled cost basis (bps). */
const TP2_BPS = 100;
/** Hard stop, return over the filled cost basis (bps). */
const SL_BPS = 60;
/** Max bars to hold a position. */
const HOLD_BARS = 120;
/** Bars to wait after a full exit before the next entry. */
const COOL_BARS = 5;
const MAX_SLIPPAGE_BPS = 10_000;

/** CBBTC closes by batch seq (null before its first bar / on a missed minute). */
const closes: (bigint | null)[] = [];
/** Batch seq at which the current position was first seen, null when flat. */
let entrySeq: number | null = null;
/** 0 = flat, 1 = holding the full position, 2 = first half sold. */
let stage = 0;
let cool = 0;

function retBps(now: bigint, then: bigint): number {
  return Math.log(Number(now) / Number(then)) * 1e4;
}

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    closes.push(state.close(SYMBOL));
    if (cool > 0) cool -= 1;
    if (state.warmingUp) return [];
    const pos = state.positions.get(SYMBOL);
    if (!pos || pos.qty === 0n) {
      stage = 0;
      if (cool > 0) return [];
      const seq = state.seq;
      if (seq < REGIME_BARS) return [];
      const now = closes[seq];
      const then15 = closes[seq - LOOKBACK_BARS];
      const then240 = closes[seq - REGIME_BARS];
      if (now === null || then15 === null || then240 === null) return [];
      if (retBps(now, then15) < -DIP_BPS && retBps(now, then240) > REGIME_MIN_BPS) {
        if (state.cash < 1_000_000n) return [];
        stage = 1;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    // In a position: exits are measured from the filled cost basis
    // (cost per unit), which the harness keeps proportional on a partial sell.
    if (entrySeq === null) entrySeq = state.seq;
    const entryPx = (pos.cost * 10_000_000n) / pos.qty;
    const now = state.close(SYMBOL);
    if (now === null) return [];
    const ret = retBps(now, entryPx);
    if (stage === 1 && ret >= TP1_BPS) {
      stage = 2;
      const half = pos.qty / 2n;
      if (half === 0n) return [];
      return [{ side: 'sell', symbol: SYMBOL, qty: half, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    if (ret >= TP2_BPS || ret <= -SL_BPS || state.seq - entrySeq >= HOLD_BARS) {
      entrySeq = null;
      stage = 0;
      cool = COOL_BARS;
      return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
