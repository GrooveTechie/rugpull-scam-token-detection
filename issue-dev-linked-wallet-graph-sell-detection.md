# Dev-Linked Wallet Graph + Heuristic Sell Detection (v1) + Post-Detection Recheck Monitoring

## What it is
Build a lightweight **dev-linked wallet graph** starting from:
- token **creator** (best-effort; if discoverable)
- **initial liquidity funder** (best-effort; as liquidity checks mature)
- **authority wallets** (mint authority / freeze authority)

Track:
- **direct sells** (dev-linked wallet sells > threshold)
- **proxy sells** (dev-linked wallet transfers → recipient sells within N minutes)

Add **post-detection monitoring**: recheck and rescore after **N minutes** to catch delayed sells.

## Why it’s valuable
- Catches real dev rugs, not just bot noise
- Much harder to evade than simple “dev wallet sold” checks
- Observational only (no strategy assumptions)
- Removes false confidence after a “clean launch”

## How it fits RugWatch
RugWatch already reasons about “malicious actors”; this improves **attribution**:
- Not predicting price
- Detecting **asymmetric exits** by dev-linked wallets

---

## Proposed v1 design (DEX-agnostic / heuristic)
### A) Dev-linked wallet graph
Seed wallets (best-effort):
- mint authority + freeze authority addresses (currently checked as booleans; extend to return addresses)
- creator/deployer (if we can infer from early mint creation / first-seen tx)
- initial liquidity funder (future hook from liquidity checks)

Graph expansion (bounded BFS; heuristics):
- include wallets that receive token transfers from seeds within early window
- include wallets funded by seeds (SOL transfers) within early window
- optionally include co-signer/signature relationships (if helpful and affordable)

Hard caps:
- max depth
- max nodes
- max signatures per wallet
- max RPC budget per token evaluation

### B) Sell detection v1 (heuristic)
Avoid DEX-specific instruction decoding in v1.

Signals (thresholded + configurable):
- **Token balance drop** for dev-linked wallets within lookback window
- **Proxy pattern**: dev-linked wallet transfers tokens to intermediary; intermediary’s token balance drops and/or shows sell-like behavior within `PROXY_WINDOW_MINUTES`
- Optional reinforcement: **SOL inflow correlation** during token balance drop window

Evidence:
- include at least a tx signature list and timestamps/slots where possible.

### C) Post-detection monitoring (recheck)
After a mint is detected/scored, schedule a recheck/rescore after `MONITOR_RECHECK_MINUTES`.

Monitoring constraints:
- bounded token tracking (max tracked tokens)
- TTL eviction for old tokens
- dedupe alerts to prevent spam
- resend allowed on meaningful risk delta / threshold crossing

---

## Scoring behavior
- **Direct dev sell > threshold** → immediate **critical**
- **Proxy sell pattern detected** → heavy score increase
- **Dev movement without sell** → moderate warning

---

## Config (env vars) to add
Add to `src/lib/config.ts` (and document in `README.md`):

**Monitoring**
- `MONITOR_RECHECK_MINUTES` (default: `15`)
- `MONITOR_MAX_TRACKED_TOKENS` (default: `200`)
- `MONITOR_TTL_MINUTES` (default: `120`)
- `MONITOR_RPC_BUDGET_PER_TOKEN` (default: `50`)
- `ALERT_DEDUPE_TTL_MINUTES` (default: `30`)
- `ALERT_RESEND_SCORE_DELTA` (default: `10`)

**Dev graph**
- `DEV_GRAPH_ENABLED` (default: `true`)
- `DEV_GRAPH_LOOKBACK_MINUTES` (default: `30`)
- `DEV_GRAPH_MAX_WALLETS` (default: `50`)
- `DEV_GRAPH_DEPTH` (default: `2`)

**Sell detection**
- `SELL_DETECTION_ENABLED` (default: `true`)
- `SELL_LOOKBACK_MINUTES` (default: `15`)
- `SELL_MIN_TOKEN_DROP_PCT` (default: `20`)
- `SELL_MIN_SUPPLY_PCT` (default: `0.25`) (percent of supply)
- `PROXY_WINDOW_MINUTES` (default: `10`)
- `PROXY_MAX_HOPS` (default: `1`)
- `SELL_DEV_WEIGHT` (default: `25`)
- `SELL_PROXY_WEIGHT` (default: `20`)
- `SELL_MOVEMENT_NO_SELL_WEIGHT` (default: `10`)

---

## Implementation touchpoints
- `src/watchers/newTokenWatcher.ts`: schedule recheck after detection
- `src/scoring/riskScoring.ts`: incorporate dev-graph + sell heuristics into breakdown/reasons
- `src/checks/tokenChecks.ts`: return authority *addresses* (not just booleans)
- `src/checks/liquidityChecks.ts`: add hooks for initial liquidity funder (as available)
- `src/services/telegram.ts` + `src/services/discord.ts`: alert dedupe + “initial vs recheck” messaging
- `src/types.ts`: new types for graph + sell events + monitoring metadata
- (new) `src/checks/devWalletGraphChecks.ts`: main implementation of graph + signals
- (new) `src/lib/txAnalysis.ts`: RPC helpers + caching + concurrency limits (if needed)

---

## Acceptance criteria
- On mint detection, system:
  - scores immediately (existing behavior)
  - schedules recheck after `MONITOR_RECHECK_MINUTES`
  - stops monitoring after `MONITOR_TTL_MINUTES` (or eviction by `MONITOR_MAX_TRACKED_TOKENS`)
- v1 sell detection does not require DEX-specific decoding
- Scoring includes:
  - dev-linked wallet analysis section in breakdown
  - direct/proxy sell flags with clear reasons
  - marks evaluation as partial/truncated when RPC budgets/caps are hit
- Alerts:
  - deduped for `ALERT_DEDUPE_TTL_MINUTES`
  - resend allowed when threshold crossing or +Δscore ≥ `ALERT_RESEND_SCORE_DELTA`
  - include whether alert is “initial” vs “recheck” and what changed
- Safety:
  - hard caps enforced (graph size, depth, signatures per wallet)
  - no crashes on RPC failures; graceful degradation with logs

---

## Task breakdown
1) Add types in `src/types.ts` for `DevLinkedWalletGraph`, `SellEvent`, `DevSellCheckResult`, monitoring metadata.
2) Extend `src/checks/tokenChecks.ts` return values to include authority addresses.
3) Add tx analysis helpers (paging, caching, concurrency, budget).
4) Implement dev-linked graph builder (bounded BFS).
5) Implement direct sell detection + proxy sell correlation.
6) Wire into `src/scoring/riskScoring.ts` scoring breakdown + weights.
7) Add monitoring scheduler + state store (in watcher or a new monitor service).
8) Add alert dedupe + delta resend logic.
9) Add minimal tests with mocked RPC payloads (no mainnet hits).
