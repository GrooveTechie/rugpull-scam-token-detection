---
name: 🔍 Funding Source Clustering
about: Detect sybil attacks and bot networks through funding source analysis
title: '[FEATURE] Funding Source Clustering'
labels: ['enhancement', 'tier-3', 'low-priority', 'analytics']
assignees: ''
---

## Feature Description

Analyze funding sources of buyer wallets to detect sybil attacks, bot networks, and coordinated buying that artificially inflates apparent organic interest.

## Problem Statement

Bot operators often fund multiple wallets from a single source or a small cluster of sources. Detecting these funding patterns helps identify:
- Sybil attacks (fake users/wallets)
- Bot networks (coordinated buying)
- Artificial volume inflation
- Wash trading setups

While less critical for detecting dev rugs post-entry, this is valuable for assessing true organic interest and market manipulation.

## Proposed Solution

### Funding Source Analysis

1. **Trace funding origins:**
   - For each buyer wallet, trace back funding source (1-2 hops)
   - Identify common funding wallets
   - Cluster wallets with shared funding

2. **Detect patterns:**
   - Single source funding multiple buyers → sybil cluster
   - Common funding pattern across many wallets → bot network
   - CEX funding vs DEX funding vs unknown

3. **Calculate metrics:**
   - Funding source concentration
   - Cluster size and distribution
   - Fresh vs aged wallet funding

## Value & Impact

**Why it's valuable:**
- Identifies sybil attacks and bot networks
- Reveals artificial volume inflation
- Helps assess true organic interest
- Supports wash trading detection

**How it fits RugWatch:**
- Supporting signal for overall risk assessment
- Less critical for dev rug detection
- More useful for bot/manipulation detection

**Note:** Good for sybil/bot detection, less critical for dev rugs *post-entry*. Better as a supporting signal than core feature.

## Risk Scoring Behavior

- **High funding concentration** (>50% from single source) → moderate risk increase
  - Suggests coordinated bot activity
- **Large sybil cluster detected** (>20 wallets from one source) → risk flag
  - Artificial interest inflation
- **Fresh wallet funding** (all wallets <24hrs old) → mild risk increase
  - Common in bot networks
- **Diverse funding sources** → neutral or slight positive
  - More likely organic

## Technical Considerations

### Data Collection
- Track SOL transfers to buyer wallets
- Build funding graph (1-2 hops deep)
- Identify common funding sources
- Handle CEX withdrawal patterns

### Clustering Algorithm
- Group wallets by common funding source
- Calculate cluster sizes and metrics
- Detect funding patterns (timing, amounts)
- Identify sybil network signatures

### Performance
- Limit graph depth to 1-2 hops
- Cache funding source lookups
- Balance accuracy vs computation cost
- Consider RPC rate limits

### Edge Cases
- CEX withdrawals (many wallets, one source)
- Legitimate batch funding (team distribution)
- Proxy contract funding
- Mixed funding sources

## Implementation Strategy

1. **Funding trace:**
   - For each buyer, query incoming SOL transfers
   - Build funding graph (1-2 hops)
   - Identify ultimate funding sources

2. **Clustering:**
   - Group wallets by shared funding
   - Calculate cluster metrics
   - Detect suspicious patterns

3. **Pattern analysis:**
   - Identify sybil signatures
   - Detect bot network funding
   - Distinguish CEX vs organic funding

4. **Risk integration:**
   - Add penalties for high concentration
   - Flag large sybil clusters
   - Provide pattern explanations

## Priority

**Tier 3 - Nice to Have**

Useful but optional. Implement only after Tier 1 and Tier 2 features.

## Acceptance Criteria

- [ ] Trace funding sources for buyer wallets (1-2 hops)
- [ ] Build funding source graph
- [ ] Cluster wallets by common funding source
- [ ] Calculate funding concentration metrics
- [ ] Detect sybil attack patterns (single source → many buyers)
- [ ] Detect bot network signatures
- [ ] Distinguish CEX vs organic funding
- [ ] Add moderate risk for high funding concentration
- [ ] Add risk flag for large sybil clusters
- [ ] Log funding patterns and clusters
- [ ] Optimize RPC usage for graph building
- [ ] Add tests for funding trace
- [ ] Add tests for clustering
- [ ] Update documentation

## Configuration Parameters

Suggested defaults:
- Funding graph depth: 1-2 hops
- High concentration threshold: 50% from single source
- Large cluster threshold: 20+ wallets
- Fresh wallet threshold: <24 hours old
- Minimum cluster size to flag: 5 wallets
- CEX address whitelist: known exchange hot wallets

## Related Issues

Part of the RugWatch improvement initiative. May relate to:
- Early Holder Persistence Score (validate organic vs bot buyers)
- Sell Concentration Index (correlate with selling patterns)

## Example Patterns

### Sybil Attack
```
Funding Source A
  ├─> Buyer 1 (0.1 SOL)
  ├─> Buyer 2 (0.1 SOL)
  ├─> Buyer 3 (0.1 SOL)
  └─> ... 50 more

Alert: Sybil cluster detected (53 wallets from one source)
```

### Organic Funding
```
Buyer 1 ← CEX Withdrawal
Buyer 2 ← Aged Wallet (6 months old)
Buyer 3 ← DEX Swap
Buyer 4 ← Direct SOL transfer (various sources)

Status: Diverse funding, likely organic
```

## Future Enhancements

- Machine learning for funding pattern recognition
- Integration with known CEX address databases
- Cross-chain funding analysis
- Historical funding reputation scoring
- Correlation with post-buy behavior patterns
