---
name: 💧 Liquidity Event Classifier (Intent-Aware)
about: Classify liquidity pool events by intent to distinguish benign from hostile actions
title: '[FEATURE] Liquidity Event Classifier (Intent-Aware)'
labels: ['enhancement', 'tier-1', 'high-priority', 'liquidity']
assignees: ''
---

## Feature Description

Implement intent-aware classification of liquidity pool events to distinguish between benign liquidity operations and hostile rug pull actions.

## Problem Statement

Current approach treats all LP changes similarly: "LP changed = bad". However, not all liquidity events are malicious. We need to classify events by *intent* to reduce false positives and better identify actual rug risks.

## Proposed Solution

### Classify Liquidity Events

Instead of treating all LP changes as risky, classify into:

1. **Symmetric add** - Adding liquidity proportionally
   - Risk: Good / Neutral
   - Behavior: Increases pool depth

2. **Symmetric migration** - Moving liquidity to another pool
   - Risk: Neutral with warning
   - Behavior: Remove + Add elsewhere, maintains total liquidity

3. **Asymmetric removal** - Removing more than added
   - Risk: Bad
   - Behavior: Reduces pool depth, potential rug

4. **Stealth drain** - Gradual reduction without notice
   - Risk: Very bad
   - Behavior: Series of small removals over time

## Value & Impact

**Why it's valuable:**
- LP actions are one of the few *privileged* dev controls
- Existing tools treat all LP events similarly
- Intent matters for accurate risk assessment

**How it fits RugWatch:**
- Squarely rug detection, not trading strategy
- No timing or trading logic required
- Improves explainability ("LP removed without replacement")

## Risk Scoring Behavior

- **Hostile LP removal** → critical risk flag
- **Migration without announcement** → high risk
- **Stealth drain detected** → very high risk
- **Benign adds** → neutral or slight positive signal
- **Symmetric migration** → warning but not penalized heavily

## Technical Considerations

### Event Detection
- Monitor LP token mint/burn events
- Track pool reserve changes over time
- Identify wallet performing LP operations
- Correlate with known dev wallets

### Classification Logic
- **Symmetric add:** reserves increase proportionally
- **Symmetric migration:** remove from pool A + add to pool B within time window
- **Asymmetric removal:** reserves decrease without corresponding add
- **Stealth drain:** multiple small removals over time window

### Migration Detection
- Track LP operations across different pools
- Set time window for migration correlation (e.g., 30 minutes)
- Verify if liquidity moved to legitimate pool

### Announcement Correlation
- Check for recent social media announcements
- Verify migration was communicated (manual or automated)
- Flag silent migrations as higher risk

## Implementation Strategy

1. **Event monitoring:**
   - Subscribe to LP token events (mint/burn)
   - Track reserve changes in pools
   - Record timestamps and amounts

2. **Classification engine:**
   - Implement rules for each event type
   - Calculate symmetry ratios
   - Detect patterns over time

3. **Intent analysis:**
   - Correlate events across pools
   - Check for migration patterns
   - Identify stealth drain sequences

4. **Risk integration:**
   - Feed classifications into risk scoring
   - Provide clear explanations for alerts
   - Update scores based on event type

## Priority

**Tier 1 - Highest Priority**

Critical for accurate rug detection with low false positives.

## Acceptance Criteria

- [ ] Monitor LP token mint/burn events
- [ ] Track pool reserve changes over time
- [ ] Classify symmetric add events
- [ ] Classify symmetric migration events
- [ ] Classify asymmetric removal events
- [ ] Detect stealth drain patterns
- [ ] Set configurable time windows for migration detection
- [ ] Add critical risk for hostile LP removal
- [ ] Add high risk for silent migrations
- [ ] Add very high risk for stealth drains
- [ ] Provide explainable reasons for each classification
- [ ] Add tests for each event type classification
- [ ] Update documentation

## Related Issues

Part of the RugWatch improvement initiative. May relate to:
- Authority Mutation Watcher (authority over LP pools)
- Dev-Linked Wallet Graph (LP operator identification)

## Configuration Parameters

Suggested defaults:
- Migration correlation window: 30 minutes
- Stealth drain threshold: 3+ removals within 24 hours
- Asymmetry ratio threshold: >20% imbalance
- Minimum significant removal: 10% of total liquidity
