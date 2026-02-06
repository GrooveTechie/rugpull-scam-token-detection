---
name: 📊 Early Holder Persistence Score
about: Track early buyer cohorts to distinguish organic holders from bot churn
title: '[FEATURE] Early Holder Persistence Score'
labels: ['enhancement', 'tier-2', 'medium-priority', 'analytics']
assignees: ''
---

## Feature Description

Track a cohort of early buyers and measure their persistence over time to distinguish between bot churn, dev exits, and organic early believers.

## Problem Statement

Not all early trading activity is equal. We need to differentiate between:
- Bot churn (high turnover, no conviction)
- Dev exits (coordinated early selling)
- Organic early believers (hold through volatility)

Early holder persistence is a strong signal against both bots *and* dev rugs.

## Proposed Solution

### Track Early Buyer Cohorts

1. **Identify early buyers:**
   - Capture wallets that buy within minute 0-2 of launch
   - Record initial purchase amounts and timestamps
   - Store as "early cohort"

2. **Measure persistence:**
   - Check how many early buyers still hold at checkpoints
   - Checkpoints: 5min, 15min, 1hr, 4hr, 24hr
   - Calculate persistence ratio: (holders remaining / initial cohort)

3. **Analyze patterns:**
   - Rapid decay → bot activity or coordinated dump
   - Stable holdings → organic interest
   - Selective decay → potential dev wallet identification

## Value & Impact

**Why it's valuable:**
- Distinguishes bot churn from organic interest
- Identifies coordinated early exits (potential dev dumps)
- Strong signal for distribution health
- Can inform dev wallet attribution

**How it fits RugWatch:**
- Still risk assessment, not trade timing
- Framed as "distribution health" metric
- Data-heavy but very telling signal

## Risk Scoring Behavior

- **Rapid early holder decay (>70% within 15 min)** → higher rug risk
  - Suggests bot activity or coordinated dump
- **Stable early holders (>50% retention at 1hr)** → risk reduction
  - Indicates organic interest and conviction
- **Gradual decay** → neutral (normal market behavior)
- **Selective large holder exits** → investigate for dev wallets

## Technical Considerations

### Data Collection
- Subscribe to swap events at launch
- Track buyer addresses and amounts for first 2 minutes
- Record token balances at each checkpoint
- Handle edge cases (transfers vs sells)

### Persistence Calculation
```
Persistence Ratio = (Current Holders / Initial Cohort Size) * 100
```

### Performance
- Consider sampling for high-volume launches
- Cache balance checks to reduce RPC load
- Archive cohort data for historical analysis

### Checkpoints
- **5 minutes** - catch immediate dumps
- **15 minutes** - bot churn detection
- **1 hour** - early conviction test
- **4 hours** - mid-term stability
- **24 hours** - long-term organic interest

## Implementation Strategy

1. **Cohort identification:**
   - Monitor buys during first 2 minutes
   - Store wallet addresses and amounts
   - Tag as "early cohort"

2. **Checkpoint monitoring:**
   - Schedule balance checks at defined intervals
   - Calculate persistence ratios
   - Detect rapid decay patterns

3. **Pattern analysis:**
   - Identify suspicious decay patterns
   - Flag coordinated exits
   - Cross-reference with dev wallet graph

4. **Scoring integration:**
   - Adjust risk score based on persistence metrics
   - Provide distribution health insights
   - Alert on suspicious patterns

## Priority

**Tier 2 - Very Useful**

Adds depth and confidence but not strictly required on day one. Implement after Tier 1 features.

## Acceptance Criteria

- [ ] Identify and track buyers in first 2 minutes of launch
- [ ] Store early cohort data (addresses, amounts, timestamps)
- [ ] Implement balance checking at defined checkpoints
- [ ] Calculate persistence ratios at each checkpoint
- [ ] Detect rapid decay patterns (>70% within 15 min)
- [ ] Add risk score penalty for suspicious decay
- [ ] Add risk score reduction for stable holders
- [ ] Log persistence metrics and patterns
- [ ] Optimize RPC usage for balance checks
- [ ] Add tests for cohort tracking
- [ ] Add tests for persistence calculations
- [ ] Update documentation

## Configuration Parameters

Suggested defaults:
- Early window: 0-2 minutes after launch
- Checkpoints: 5min, 15min, 1hr, 4hr, 24hr
- Rapid decay threshold: >70% loss within 15 minutes
- Stable threshold: >50% retention at 1 hour
- Minimum cohort size: 10 wallets (configurable)

## Related Issues

Part of the RugWatch improvement initiative. May relate to:
- Dev-Linked Wallet Graph (cross-reference for attribution)
- Sell Concentration / Coordination Index (coordinated exit detection)

## Future Enhancements

- Correlate persistence with price action
- Track transfers vs sells separately
- Build reputation scores for persistent holders
- Identify "diamond hands" wallets for positive signals
