---
name: 🎯 Sell Concentration / Coordination Index
about: Measure sell concentration and temporal clustering to detect coordinated exits
title: '[FEATURE] Sell Concentration / Coordination Index'
labels: ['enhancement', 'tier-2', 'medium-priority', 'analytics']
assignees: ''
---

## Feature Description

Implement rolling measures of sell concentration and temporal clustering to detect coordinated exit patterns that indicate rug pulls, even without explicit dev attribution.

## Problem Statement

Rugs don't just sell individually — they sell **together**. We need to detect coordinated exits through:
- Concentration: Top N sellers' share of total volume
- Clustering: Temporal grouping of sells within short windows

This catches coordinated behavior even when individual wallets aren't identified as "dev wallets."

## Proposed Solution

### Sell Concentration Index

Measure top-N sellers' share of total selling volume:

```
Concentration = (Top N Sell Volume / Total Sell Volume) * 100
```

- High concentration (>50%) in top 5 sellers → suspicious
- Distributed selling across many wallets → healthier

### Temporal Clustering Index

Measure time-based clustering of sell events:

```
Clustering = (Sells in Window / Total Sells) * Temporal Weight
```

- Many sells within short window (e.g., 20 sells in 2 minutes) → coordinated
- Evenly distributed sells over time → organic

### Rolling Windows

Calculate metrics over multiple time windows:
- 2 minutes - catch immediate coordinated dumps
- 5 minutes - detect short-term coordination
- 15 minutes - identify sustained selling pressure
- 1 hour - measure broader distribution

## Value & Impact

**Why it's valuable:**
- Catches coordinated exits even without dev wallet attribution
- Detects unnatural sell patterns that humans recognize visually
- Works alongside wallet graph for comprehensive coverage

**How it fits RugWatch:**
- Aligned with "malicious behavior detection"
- Explainable as "unnatural sell patterns"
- No strategy assumptions, purely observational

## Risk Scoring Behavior

- **High concentration in short window** (>60% from top 5 in 2min) → risk spike
  - Immediate critical alert
- **Sustained high clustering** (>10 sells/minute for 5+ minutes) → high risk
  - Potential coordinated dump
- **Decentralized selling** → neutral or positive signal
  - Normal market behavior
- **Concentration spike after calm period** → suspicious pattern
  - May indicate waiting for liquidity to build

## Technical Considerations

### Data Collection
- Track all sell transactions
- Record seller address, amount, and timestamp
- Maintain rolling window buffers
- Handle high-frequency trading scenarios

### Metrics Calculation

**Concentration Index:**
```typescript
// Top N sellers' share
topNVolume = sum(top N sell amounts)
concentration = (topNVolume / totalVolume) * 100
```

**Clustering Index:**
```typescript
// Temporal density
sellsInWindow = count(sells in time window)
clustering = sellsInWindow / windowDuration
```

### Window Management
- Use sliding windows for real-time calculation
- Maintain historical data for trend analysis
- Optimize memory usage for long-running monitoring

### Thresholds
- Define suspicious concentration levels
- Set clustering rate limits
- Adjust based on token volume and holder count

## Implementation Strategy

1. **Transaction monitoring:**
   - Subscribe to all swap/sell events
   - Record seller, amount, timestamp
   - Buffer events for window analysis

2. **Concentration analysis:**
   - Track top N sellers by volume
   - Calculate their share of total
   - Update in real-time

3. **Clustering analysis:**
   - Count sells per time window
   - Calculate temporal density
   - Detect spikes and patterns

4. **Pattern detection:**
   - Identify concentration + clustering combinations
   - Flag coordinated exit signatures
   - Cross-reference with known dev wallets

5. **Risk integration:**
   - Add concentration score penalties
   - Add clustering spike alerts
   - Provide pattern explanations

## Priority

**Tier 2 - Very Useful**

Adds significant value for detecting coordinated behavior. Implement after Tier 1 features.

## Acceptance Criteria

- [ ] Track all sell transactions with amounts and timestamps
- [ ] Implement sell concentration index (top N sellers)
- [ ] Implement temporal clustering index
- [ ] Calculate metrics over multiple rolling windows (2min, 5min, 15min, 1hr)
- [ ] Detect high concentration patterns (>60% from top 5)
- [ ] Detect high clustering patterns (>10 sells/minute)
- [ ] Add risk spike for concentration + clustering combinations
- [ ] Log concentration and clustering metrics
- [ ] Optimize rolling window performance
- [ ] Add tests for concentration calculations
- [ ] Add tests for clustering detection
- [ ] Update documentation

## Configuration Parameters

Suggested defaults:
- Top N sellers to track: 5-10
- High concentration threshold: 60%
- High clustering threshold: 10 sells/minute
- Rolling windows: 2min, 5min, 15min, 1hr
- Minimum volume for analysis: 1000 transactions
- Spike detection sensitivity: 2x baseline

## Related Issues

Part of the RugWatch improvement initiative. May relate to:
- Dev-Linked Wallet Graph (coordinate with identified dev wallets)
- Early Holder Persistence Score (early cohort selling behavior)

## Example Scenarios

### Coordinated Rug
```
Time: 10:00:00 - 5 sells
Time: 10:00:30 - 15 sells ← spike
Time: 10:01:00 - 20 sells ← sustained
Concentration: 75% from top 3 ← critical

Alert: Coordinated exit detected
```

### Organic Selling
```
Time: 10:00:00 - 2 sells
Time: 10:00:30 - 3 sells
Time: 10:01:00 - 1 sell
Concentration: 15% from top 5 ← distributed

Status: Normal market activity
```

## Future Enhancements

- Correlation with price impact
- Network analysis of selling wallets
- Machine learning for pattern recognition
- Historical comparison with known rug patterns
