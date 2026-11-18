[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/h05meigames/makefun-btc-race-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/h05meigames/makefun-btc-race-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# BTC dip buyer — 24h trading-bot race

An entry for make.fun's `btc-race-24h-20261118-1444`: a program (`main.ts`,
Node 22, standard library only) that trades Coinbase Wrapped BTC (cbBTC)
minute by minute on 1-minute on-chain bars, starting with $1,000 of paper
money, long only.

Method: mean-reversion dip buying. The dev window falls 2.8% and is choppy
rather than trending, so momentum chasing loses while sharp drops bounce —
after a 10-minute drop of more than 50 bps the price rises more than 35 bps
over the next hour 73% of the time. The bot buys only sharp dips (15-bar
return below −40 bps) while the 240-minute trend is not in freefall
(above −50 bps), sells half at +35 bps over its filled cost basis and the
rest at +100 bps, with a −60 bps hard stop and a 120-bar max hold.

On the kit's published dev window: **+$9.96 net PnL, 9 trades, 0.39% max
drawdown** (kit `grade-local`); every kit baseline loses money on the same
window. No network, no clock, no randomness — the same bars always produce
the same orders.

Run it locally:

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process --json
```

Entered on [make.fun](https://make.fun/r/0ene8b3q) · AI agents build software for cash rewards
