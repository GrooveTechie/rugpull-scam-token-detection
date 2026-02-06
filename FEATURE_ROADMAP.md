# RugWatch Feature Roadmap - GitHub Issues

This document provides an overview of the planned feature enhancements for the RugWatch (Solana Rugpull & Scam Detection Bot) project. All features have been documented as GitHub issue templates in the `.github/ISSUE_TEMPLATE/` directory.

## Overview

The features are organized into three tiers based on their value and priority:

- **Tier 1 (Highest Priority):** Core features that materially improve safety and fit RugWatch's mental model perfectly
- **Tier 2 (Secondary Priority):** Very useful features that add depth and confidence
- **Tier 3 (Optional):** Nice-to-have features to implement only after higher-priority items

## Implementation Order

Based on the analysis, the recommended implementation order is:

1. **Authority Mutation Watcher** (Tier 1)
2. **Dev-Linked Wallet Graph + Sell Detection** (Tier 1)
3. **Liquidity Event Classifier** (Tier 1)
4. **Early Holder Persistence Score** (Tier 2)
5. **Sell Concentration / Coordination Index** (Tier 2)
6. **Funding Source Clustering** (Tier 3)
7. **Communication / Silence Correlates** (Tier 3)

---

## Tier 1 Features (Highest Leverage)

### 1. Authority Mutation Watcher (Hard Kill Signal)

**Issue Template:** `01-authority-mutation-watcher.md`

**What it is:**
- Continuous monitoring of mint authority, freeze authority, and upgrade authority
- Tracks state transitions over time, not just current status
- Detects when authorities change after launch

**Why it's valuable:**
- Most scanners only snapshot at launch
- Many rugs happen after trust is established
- Authority changes are far more predictive than authority presence

**Risk Scoring:**
- Authority changed after launch → +80 to rug score (near-fatal)
- Authority still present after T minutes → smaller but persistent penalty

**Labels:** `enhancement`, `tier-1`, `high-priority`, `security`

---

### 2. Dev-Linked Wallet Graph + Sell Detection

**Issue Template:** `02-dev-wallet-graph.md`

**What it is:**
- Build lightweight wallet graph starting from creator, liquidity funder, and authority wallets
- Track direct sells and proxy sells (transfer → sell within N minutes)
- Better attribution of sells to actual dev wallets

**Why it's valuable:**
- Catches real dev rugs, not just bot noise
- Much harder to evade than simple "dev wallet sold" checks
- Still observational, no strategy assumptions

**Risk Scoring:**
- Direct dev sell > threshold → immediate critical
- Proxy pattern detected → heavy score increase
- Dev movement without sell → moderate warning

**Labels:** `enhancement`, `tier-1`, `high-priority`, `tracking`

---

### 3. Liquidity Event Classifier (Intent-Aware)

**Issue Template:** `03-liquidity-event-classifier.md`

**What it is:**
- Classify liquidity events by intent instead of treating all LP changes as bad
- Categories: symmetric add, symmetric migration, asymmetric removal, stealth drain

**Why it's valuable:**
- LP actions are privileged dev controls
- Existing tools treat all LP events similarly
- Intent matters for accurate risk assessment

**Risk Scoring:**
- Hostile LP removal → critical
- Migration without announcement → high risk
- Benign adds → neutral or slight positive

**Labels:** `enhancement`, `tier-1`, `high-priority`, `liquidity`

---

## Tier 2 Features (Very Useful)

### 4. Early Holder Persistence Score

**Issue Template:** `04-early-holder-persistence.md`

**What it is:**
- Track early buyers (minute 0-2) as a cohort
- Measure how many still hold at later checkpoints (5min, 15min, 1hr, 4hr, 24hr)
- Distinguish bot churn from organic early believers

**Why it's valuable:**
- Distinguishes bot churn, dev exits, and organic believers
- Strong signal against both bots and dev rugs
- Framed as "distribution health" metric

**Risk Scoring:**
- Rapid early holder decay → higher rug risk
- Stable early holders → risk reduction

**Labels:** `enhancement`, `tier-2`, `medium-priority`, `analytics`

---

### 5. Sell Concentration / Coordination Index

**Issue Template:** `05-sell-concentration-index.md`

**What it is:**
- Rolling measure of top-N sellers' share of volume
- Temporal clustering of sells (density in time windows)
- Detect coordinated exit patterns

**Why it's valuable:**
- Rugs sell together, not individually
- Catches coordinated exits even without explicit dev attribution
- Explainable as "unnatural sell patterns"

**Risk Scoring:**
- High concentration in short window → risk spike
- Decentralized selling → neutral

**Labels:** `enhancement`, `tier-2`, `medium-priority`, `analytics`

---

## Tier 3 Features (Nice to Have)

### 6. Funding Source Clustering

**Issue Template:** `06-funding-source-clustering.md`

**What it is:**
- Analyze funding sources of buyer wallets
- Detect sybil attacks and bot networks
- Cluster wallets by shared funding sources

**Why it's valuable:**
- Good for sybil/bot detection
- Less critical for dev rugs post-entry
- Better as supporting signal

**Risk Scoring:**
- High funding concentration → moderate risk increase
- Large sybil cluster → risk flag
- Diverse funding → neutral or slight positive

**Labels:** `enhancement`, `tier-3`, `low-priority`, `analytics`

---

### 7. Communication / Silence Correlates

**Issue Template:** `07-communication-correlates.md`

**What it is:**
- Correlate social media communication with on-chain events
- Detect silent rug pulls and false announcements
- Verify claims against on-chain reality

**Why it's valuable:**
- Adds context to on-chain signals
- Catches misleading communication
- Detects "rug silence" patterns

**Note:** Inherently subjective and squishier. Better handled as external signal, not core scoring.

**Risk Scoring:**
- Silent LP removal → moderate risk increase
- False claim detected → high risk increase
- Verified claims → slight risk reduction

**Labels:** `enhancement`, `tier-3`, `low-priority`, `external-signals`

---

## How to Use These Issue Templates

### Creating Issues from Templates

1. Navigate to the [Issues](https://github.com/GrooveTechie/rugpull-scam-token-detection/issues) page
2. Click "New Issue"
3. Select the appropriate template for the feature you want to track
4. The template will pre-populate with:
   - Feature description
   - Problem statement
   - Proposed solution
   - Value & impact analysis
   - Risk scoring behavior
   - Technical considerations
   - Implementation strategy
   - Priority level
   - Acceptance criteria
   - Configuration parameters

### Issue Labels

Each template comes with pre-assigned labels:

- **Priority:** `high-priority`, `medium-priority`, `low-priority`
- **Tier:** `tier-1`, `tier-2`, `tier-3`
- **Type:** `enhancement`
- **Category:** `security`, `tracking`, `liquidity`, `analytics`, `external-signals`

### Implementation Workflow

1. **Start with Tier 1** - Implement highest-leverage features first
2. **Create issues** - Use templates to create GitHub issues for tracking
3. **Assign and prioritize** - Assign to team members and milestone
4. **Develop and test** - Follow acceptance criteria in each template
5. **Review and merge** - Ensure all criteria met before closing
6. **Move to next tier** - Complete all Tier 1 before moving to Tier 2

---

## Development Notes

### Testing Requirements

Each feature should include:
- Unit tests for core logic
- Integration tests for on-chain interactions
- Performance tests for high-volume scenarios
- Edge case handling

### Configuration Management

All features should support:
- Environment variable configuration
- Sensible defaults
- Runtime adjustability
- Documentation of parameters

### Documentation Updates

When implementing features:
- Update README.md with new capabilities
- Add configuration examples to .env.example
- Document risk scoring changes
- Provide usage examples

---

## Related Resources

- **Repository:** https://github.com/GrooveTechie/rugpull-scam-token-detection
- **Documentation:** See README.md in repository
- **Contact:** Telegram t.me/@lorine93s

---

## Contributing

When working on these features:

1. **Follow the acceptance criteria** listed in each issue template
2. **Maintain the RugWatch philosophy:**
   - Focus on rug detection, not alpha/trading signals
   - Binary, explainable, low false positives
   - Observational, no strategy assumptions
3. **Test thoroughly** before submitting PR
4. **Document changes** in code and README
5. **Update risk scoring** documentation

---

## Questions or Feedback?

- Open a discussion on GitHub Discussions
- Contact via Telegram (see README)
- Comment on specific issue templates for clarification

---

**Last Updated:** 2026-02-06
**Status:** Planning phase - issues ready to be created
