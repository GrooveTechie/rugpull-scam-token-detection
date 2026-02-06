import { logger } from '../lib/logger.js';
export class TokenMonitor {
    config;
    onRecheck;
    jobs = new Map();
    constructor(config, onRecheck) {
        this.config = config;
        this.onRecheck = onRecheck;
    }
    scheduleRecheck(mint, baselineSnapshot) {
        const now = Date.now();
        if (this.jobs.has(mint))
            return;
        this.evictIfNeeded();
        const delayMs = Math.max(1, this.config.monitorRecheckMinutes) * 60_000;
        const expiresAtMs = now + Math.max(1, this.config.monitorTtlMinutes) * 60_000;
        const timeout = setTimeout(async () => {
            const job = this.jobs.get(mint);
            if (!job)
                return;
            if (Date.now() > job.expiresAtMs) {
                this.jobs.delete(mint);
                return;
            }
            try {
                await this.onRecheck(mint, baselineSnapshot);
            }
            catch (err) {
                logger.error({ err, mint }, 'Recheck job failed');
            }
            finally {
                this.jobs.delete(mint);
            }
        }, delayMs);
        this.jobs.set(mint, {
            mint,
            baselineSnapshot,
            firstSeenMs: now,
            expiresAtMs,
            timeout
        });
    }
    evictIfNeeded() {
        const max = Math.max(1, this.config.monitorMaxTrackedTokens);
        if (this.jobs.size < max)
            return;
        // Evict oldest job
        let oldest;
        for (const job of this.jobs.values()) {
            if (!oldest || job.firstSeenMs < oldest.firstSeenMs)
                oldest = job;
        }
        if (!oldest)
            return;
        clearTimeout(oldest.timeout);
        this.jobs.delete(oldest.mint);
        logger.warn({ mint: oldest.mint }, 'Evicted token monitor job (max tracked tokens reached)');
    }
}
//# sourceMappingURL=tokenMonitor.js.map