---
name: 📢 Communication / Silence Correlates
about: Correlate social signals and communication patterns with on-chain behavior
title: '[FEATURE] Communication / Silence Correlates'
labels: ['enhancement', 'tier-3', 'low-priority', 'external-signals']
assignees: ''
---

## Feature Description

Correlate social media communication patterns (or lack thereof) with on-chain events to detect suspicious behavior like silent rug pulls or misleading announcements.

## Problem Statement

Communication patterns can be telling:
- **Silent LP removals** - No announcement before draining liquidity
- **False announcements** - Claims of "locking LP" without on-chain proof
- **Radio silence** - Dev goes dark before/during rug
- **Coordinated FUD** - Negative messaging before coordinated exits

However, this is inherently subjective and harder to quantify than pure on-chain signals.

## Proposed Solution

### Signal Collection

Track communication from:
- **Twitter/X** - Official project account
- **Telegram** - Project group activity
- **Discord** - Developer messages
- **Website** - Updates and announcements

### Correlation Analysis

1. **Silence detection:**
   - Track message frequency baseline
   - Detect unusual silence periods
   - Correlate with on-chain events (LP removal, authority changes)

2. **Announcement verification:**
   - Parse claims (e.g., "LP locked for 1 year")
   - Verify against on-chain reality
   - Flag mismatches

3. **Sentiment shifts:**
   - Monitor tone changes
   - Detect sudden negativity
   - Correlate with selling patterns

## Value & Impact

**Why it's valuable:**
- Adds context to on-chain signals
- Catches misleading communication
- Detects "rug silence" patterns
- Provides social proof validation

**How it fits RugWatch:**
- Complementary to core on-chain detection
- Inherently subjective and harder to quantify
- Better handled as **external signal**, not core scoring

**Note:** This is squishier and more subjective. Better as an external signal than core scoring logic.

## Risk Scoring Behavior

This feature is recommended as a **supporting signal** rather than a core risk score component:

- **Silent LP removal** (no announcement within 24hrs) → moderate risk increase
- **False claim detected** (says "locked" but isn't) → high risk increase
- **Sudden dev silence** (baseline 10 msg/day → 0) → mild risk flag
- **Active communication** → neutral (not automatically positive)
- **Verified claims** → slight risk reduction

## Technical Considerations

### Data Sources
- Twitter API (rate limits, authentication)
- Telegram Bot API (group membership required)
- Discord webhooks/bots (server access needed)
- Web scraping (fragile, legal concerns)

### Natural Language Processing
- Keyword extraction (lock, LP, liquidity, rug, etc.)
- Sentiment analysis (positive/negative/neutral)
- Claim parsing and categorization
- Entity recognition (wallet addresses, dates)

### Challenges
- **Subjectivity** - Hard to quantify communication quality
- **Rate limits** - API restrictions on social platforms
- **Authentication** - Need access to private groups/servers
- **False positives** - Innocent silence vs malicious silence
- **Gaming** - Easy for scammers to fake communication

### Performance
- Cache social media data to reduce API calls
- Schedule periodic checks rather than real-time
- Prioritize high-signal sources
- Handle API failures gracefully

## Implementation Strategy

1. **Social integration:**
   - Set up Twitter API access
   - Integrate Telegram bot (optional)
   - Configure Discord webhooks (optional)
   - Define data collection schedule

2. **Message analysis:**
   - Track message frequency and timing
   - Parse for key claims and statements
   - Perform basic sentiment analysis
   - Extract mentioned on-chain actions

3. **Correlation:**
   - Match announcements with on-chain events
   - Detect silence during critical events
   - Flag claim mismatches
   - Time-correlate messages with actions

4. **Signal generation:**
   - Generate warnings for suspicious patterns
   - Provide context to existing risk scores
   - Log discrepancies for review
   - **Avoid** directly inflating core risk score

## Priority

**Tier 3 - Optional**

Nice to have but very optional. Implement only after all other features if at all. Consider as a future enhancement rather than core functionality.

## Acceptance Criteria

- [ ] Integrate with at least one social platform (Twitter recommended)
- [ ] Track project communication baseline
- [ ] Detect unusual silence periods
- [ ] Parse announcements for key claims (LP locks, burns, etc.)
- [ ] Verify claims against on-chain reality
- [ ] Flag claim mismatches
- [ ] Correlate silence with LP removals/authority changes
- [ ] Generate contextual warnings (not direct risk score)
- [ ] Handle API rate limits and failures
- [ ] Add tests for claim parsing
- [ ] Add tests for verification logic
- [ ] Update documentation

## Configuration Parameters

Suggested defaults:
- Communication check frequency: every 30 minutes
- Silence threshold: <50% of baseline for >6 hours
- Announcement verification window: ±2 hours of on-chain event
- Supported platforms: Twitter (primary), others optional
- Claim keywords: ["lock", "burn", "renounce", "liquidity"]

## Related Issues

Part of the RugWatch improvement initiative. This is a **supporting feature** that adds context to:
- Authority Mutation Watcher (verify renounce announcements)
- Liquidity Event Classifier (verify migration announcements)
- Dev-Linked Wallet Graph (context for dev actions)

## Recommendations

Given the subjective nature and technical challenges:

1. **Start simple:** Twitter-only integration
2. **External signal:** Don't directly modify core risk score
3. **Human review:** Provide warnings for manual investigation
4. **Future ML:** Consider machine learning for better claim detection
5. **Optional feature:** Make this completely opt-in/out

## Example Scenarios

### Silent Rug
```
Timeline:
- 10:00 AM: Dev posts "HODL! Big news coming!"
- 11:30 AM: Last message from dev
- 02:15 PM: 80% LP removed (no announcement)
- 02:15 PM onward: Radio silence

Alert: LP removal without prior announcement - CRITICAL
```

### False Claim
```
Announcement: "LP locked for 6 months via Team Finance 🔒"
On-chain check: No lock contract detected
LP status: Unlocked, removable anytime

Alert: False lock claim detected - HIGH RISK
```

## Future Enhancements

- Multi-platform aggregation (Twitter + Telegram + Discord)
- AI-powered claim verification
- Community sentiment analysis
- Historical communication pattern scoring
- Integration with 3rd party social analytics tools
- Webhook alerts for suspicious communication patterns
