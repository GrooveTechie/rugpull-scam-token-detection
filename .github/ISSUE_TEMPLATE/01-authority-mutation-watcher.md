---
name: 🔐 Authority Mutation Watcher (Hard Kill Signal)
about: Implement continuous monitoring of authority state transitions
title: '[FEATURE] Authority Mutation Watcher (Hard Kill Signal)'
labels: ['enhancement', 'tier-1', 'high-priority', 'security']
assignees: ''
---

## Feature Description

Implement continuous monitoring of authority mutations over time to detect rug pulls that occur after trust is established.

## Problem Statement

Most scanners only snapshot authority status at launch. However, many rugs happen **after trust is established** when authorities are changed or revoked post-launch. Authority *changes* are far more predictive than authority *presence*.

## Proposed Solution

### Monitor State Transitions

Continuous monitoring of:
- **Mint authority** - track changes to who can mint new tokens
- **Freeze authority** - track changes to who can freeze accounts
- **Upgrade authority** - track changes to program upgrade capabilities

Not just "current status" but **state transitions over time**.

### Implementation Details

- Track authority values at token discovery
- Monitor for any changes to these authorities after launch
- Record timestamp of any authority changes
- Maintain history of authority transitions

## Value & Impact

**Why it's valuable:**
- Most scanners only snapshot at launch
- Many rugs happen **after trust is established**
- Authority *changes* are far more predictive than authority *presence*

**How it fits RugWatch:**
- Pure rug risk detection
- Binary, explainable, low false positives
- Maps cleanly to a "critical risk" flag

## Risk Scoring Behavior

- **Authority changed after launch** → +80 to rug score (near-fatal signal)
- **Authority still present after T minutes** → smaller but persistent penalty
- **Authority renounced** → risk reduction

## Technical Considerations

- Need to poll or subscribe to account changes
- Store authority state history (database or in-memory cache)
- Define time thresholds (e.g., "T minutes after launch")
- Handle edge cases (migrations, legitimate upgrades)

## Priority

**Tier 1 - Highest Priority**

This is a no-brainer addition with high leverage that fits RugWatch perfectly.

## Acceptance Criteria

- [ ] Track mint authority changes over time
- [ ] Track freeze authority changes over time
- [ ] Track upgrade authority changes (if applicable)
- [ ] Detect and flag authority changes post-launch
- [ ] Add +80 rug score for authority mutations after launch
- [ ] Add persistent penalty for continued authority presence
- [ ] Log authority change events with timestamps
- [ ] Update risk scoring logic
- [ ] Add tests for authority mutation detection
- [ ] Update documentation

## Related Issues

Part of the RugWatch improvement initiative focusing on post-launch rug detection.
