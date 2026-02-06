---
name: 🕸️ Dev-Linked Wallet Graph + Sell Detection
about: Build wallet graph to track developer sells and proxy patterns
title: '[FEATURE] Dev-Linked Wallet Graph + Sell Detection'
labels: ['enhancement', 'tier-1', 'high-priority', 'tracking']
assignees: ''
---

## Feature Description

Build a lightweight wallet graph starting from key actors (creator, liquidity funder, authority wallets) to track direct sells and proxy sell patterns that indicate developer rugs.

## Problem Statement

Simple "dev wallet sold" checks are easy to evade through proxy wallets. We need better attribution to catch *real* dev rugs, not just bot noise, while remaining observational without making strategy assumptions.

## Proposed Solution

### Build Wallet Graph

Start tracking from:
- **Creator wallet** - initial token deployer
- **Initial liquidity funder** - wallet that provided initial LP
- **Authority wallets** - mint/freeze authority holders

### Track Sell Patterns

Monitor for:
- **Direct sells** - immediate sales from tracked wallets
- **Proxy sells** - transfers followed by sells within N minutes
  - Transfer from tracked wallet → sell within time window
  - Catches attempts to hide dev exits

## Value & Impact

**Why it's valuable:**
- Catches *real* dev rugs, not just bot noise
- Much harder to evade than simple "dev wallet sold" checks
- Still observational — no strategy assumptions

**How it fits RugWatch:**
- RugWatch already reasons about "malicious actors"
- This is just **better attribution**
- Not predicting price, detecting asymmetric exits

## Risk Scoring Behavior

- **Direct dev sell > threshold** → immediate critical risk
- **Proxy pattern detected** (transfer → sell) → heavy score increase
- **Dev movement without sell** → moderate warning
- **Multiple proxy sells** → compounding critical risk

## Technical Considerations

- Maintain graph of related wallets (1-2 hops deep)
- Track transfers and swaps from tracked addresses
- Define time window for proxy detection (e.g., 5-15 minutes)
- Set thresholds for "significant" sells (% of holdings or absolute value)
- Consider gas-optimized querying of transaction history
- Handle wallet clustering/sybil detection

## Implementation Strategy

1. **Wallet identification:**
   - Extract creator from token mint transaction
   - Identify initial liquidity provider from pool creation
   - Track authority wallets from token metadata

2. **Graph construction:**
   - Build 1-2 hop graph from key wallets
   - Update graph as new transfers occur

3. **Pattern detection:**
   - Monitor all sells from graph wallets
   - Detect transfer → sell sequences
   - Flag coordinated selling patterns

4. **Scoring integration:**
   - Feed detected patterns into risk scoring
   - Provide explainable reasons for score changes

## Priority

**Tier 1 - Highest Priority**

This single feature removes most false confidence after a "clean launch".

## Acceptance Criteria

- [ ] Identify and track creator wallet
- [ ] Identify and track initial liquidity funder
- [ ] Identify and track authority wallets
- [ ] Build wallet graph (1-2 hops from key wallets)
- [ ] Detect direct sells from tracked wallets
- [ ] Detect proxy sell patterns (transfer → sell within N minutes)
- [ ] Set configurable thresholds for sell detection
- [ ] Add critical risk score for direct dev sells
- [ ] Add heavy penalty for proxy patterns
- [ ] Log wallet graph and sell events
- [ ] Add tests for wallet graph construction
- [ ] Add tests for sell pattern detection
- [ ] Update documentation

## Related Issues

Part of the RugWatch improvement initiative. May relate to:
- Sell Concentration / Coordination Index
- Early Holder Persistence Score

## References

- Wallet graph depth: 1-2 hops recommended
- Proxy sell time window: 5-15 minutes typical
- Sell threshold: Configure based on token economics
