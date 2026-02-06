## RugWatch — Solana Rugpull & Scam Detection Bot

Detects risky new token launches on Solana (e.g., Pump.fun/Raydium/Meteora) using on-chain checks, liquidity heuristics, and risk scoring. Sends alerts to Telegram and Discord.

### Features

- **New token watcher**: Subscribes to Solana logs to detect fresh mints/pools
- **Authority checks**: Mint/freeze authority status, decimals, supply
- **Liquidity checks (extensible)**: Hook points for per-DEX LP health
- **Dev-Linked Wallet Graph**: Tracks creator, liquidity funder, and authority wallets
- **Sell Detection**: Identifies direct and proxy sells from dev-linked wallets
- **Risk scoring**: Weighted rules producing 0–100 score with reasons
- **Alerts**: Telegram and Discord notifications when risk exceeds threshold
- **TypeScript + Node 18+**

### Quickstart

1) Install

```bash
npm i
```

2) Configure environment

Create `.env` (or fill `env.example` and rename):

```env
RPC_ENDPOINTS=https://api.mainnet-beta.solana.com
WS_ENDPOINT=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
RISK_SCORE_ALERT_THRESHOLD=70
PROGRAM_IDS=
SIM_BUY_SOL=0.01
```

3) Develop

```bash
npm run dev
```

4) Build & run

```bash
npm run build
npm start
```

### Architecture

- `src/index.ts`: App entrypoint. Loads config, creates Solana client, runs watcher, scores risk, sends alerts.
- `src/lib/config.ts`: Reads environment variables and provides typed config.
- `src/lib/solana.ts`: Connection factory to Solana RPC/WebSocket.
- `src/lib/logger.ts`: Pino logger.
- `src/watchers/newTokenWatcher.ts`: Subscribes to program logs and emits `TokenEvent`.
- `src/checks/tokenChecks.ts`: SPL token authority/supply checks.
- `src/checks/liquidityChecks.ts`: Extension points for per-DEX liquidity analysis.
- `src/graph/walletGraph.ts`: Builds wallet graph from token mint (creator, liquidity funder, authorities).
- `src/detection/sellDetection.ts`: Detects sell events from dev-linked wallets (direct and proxy).
- `src/scoring/riskScoring.ts`: Aggregate risk calculation.
- `src/services/telegram.ts`, `src/services/discord.ts`: Alert integrations.
- `src/simulation/honeypotSimulator.ts`: Placeholder for buy/sell simulation.

### Extending per DEX

- Pump.fun: parse logs for mint address; read bonding curve and pool state accounts
- Raydium: track AMM pool creation; read LP token mint and lock/owner
- Meteora: DLMM pool state for initial liquidity

Add concrete readers in `checks/liquidityChecks.ts` and feed into `riskScoring`.

### Dev-Linked Wallet Graph & Sell Detection

The wallet graph feature builds a lightweight network of wallets connected to a new token launch to detect potentially malicious behavior:

#### Tracked Wallets

- **Creator**: The wallet that deployed/created the token mint
- **Liquidity Funder**: The wallet that provided initial liquidity (identified via large SOL transfers)
- **Authority Wallets**: Mint authority, freeze authority, and update authority wallets

#### Sell Detection

The system monitors recent transactions to detect:

1. **Direct Sells**: Token transfers/swaps from wallets directly in the graph
   - Weighted heavily in risk scoring (+15 per sell, capped at +25)
   - Strong indicator of potential rugpull

2. **Proxy Sells**: Large token transfers from wallets one hop away from tracked wallets
   - Moderate risk indicator (+5 per sell, capped at +10)
   - Suggests potential wash trading or coordinated dump

#### How It Works

1. When a new token is detected, the system builds a wallet graph from on-chain data
2. Recent transactions (last 20 by default) are analyzed for sell patterns
3. Sells from tracked wallets increase the risk score
4. Risk score feeds into alert thresholds for Telegram/Discord notifications

This helps identify scenarios where developers or insiders are dumping tokens on early buyers, a common rugpull pattern.

### Risk Scoring (default weights)

- Mint authority active: +30
- Freeze authority active: +20
- Low initial liquidity (<5 SOL): +15
- LP not locked: +20
- Uncommon decimals: +5
- **Dev wallet direct sells: +15 per sell (max +25)**
- **Dev wallet proxy sells: +5 per sell (max +10)**

Scores cap at 100. Tune weights per your strategy.

### Honeypot Simulation

Implement buy/sell attempts via route builders for the target DEX and `simulateTransaction`. If sell fails or taxes are extreme, add to risk.

### Production Notes

- Use multiple RPCs (Helius/Triton/Ankr) for reliability.
- Consider a small database to track processed mints and deployer reputation.
- Backoff/retry on network errors.

## Roadmap

Want to contribute? Check out our [Feature Roadmap](FEATURE_ROADMAP.md) for planned enhancements!

We have 7 planned features organized by priority:
- **Tier 1:** Authority Mutation Watcher, Dev Wallet Graph, Liquidity Event Classifier
- **Tier 2:** Early Holder Persistence Score, Sell Concentration Index
- **Tier 3:** Funding Source Clustering, Communication Correlates

Browse the [issue templates](.github/ISSUE_TEMPLATE/) or see the [guide to creating issues](docs/CREATE_ISSUES_GUIDE.md).

## Contact

- Telegram: t.me/@lorine93s