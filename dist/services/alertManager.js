export class AlertManager {
    config;
    stateByMint = new Map();
    constructor(config) {
        this.config = config;
    }
    shouldSend(mint, score) {
        const now = Date.now();
        const ttlMs = Math.max(0, this.config.alertDedupeTtlMinutes) * 60_000;
        const threshold = this.config.riskAlertThreshold;
        const forceReason = this.forceSendReason(score);
        const prev = this.stateByMint.get(mint);
        if (!prev) {
            if (score.total >= threshold || forceReason) {
                this.stateByMint.set(mint, { lastSentAtMs: now, lastSentScore: score.total });
                return { send: true, reason: forceReason ?? 'initial-above-threshold' };
            }
            return { send: false, reason: 'initial-below-threshold' };
        }
        // Dedupe window
        if (ttlMs > 0 && now - prev.lastSentAtMs < ttlMs && !forceReason) {
            return { send: false, reason: 'deduped' };
        }
        const delta = score.total - prev.lastSentScore;
        const crossed = prev.lastSentScore < threshold && score.total >= threshold;
        const deltaEnough = delta >= this.config.alertResendScoreDelta;
        if (forceReason || crossed || deltaEnough) {
            this.stateByMint.set(mint, { lastSentAtMs: now, lastSentScore: score.total });
            return { send: true, reason: forceReason ?? (crossed ? 'crossed-threshold' : 'score-delta') };
        }
        return { send: false, reason: 'no-material-change' };
    }
    forceSendReason(score) {
        if (score.breakdown.devDirectSell && score.breakdown.devDirectSell > 0)
            return 'dev-direct-sell';
        if (score.breakdown.devProxySell && score.breakdown.devProxySell > 0)
            return 'dev-proxy-sell';
        return undefined;
    }
}
//# sourceMappingURL=alertManager.js.map