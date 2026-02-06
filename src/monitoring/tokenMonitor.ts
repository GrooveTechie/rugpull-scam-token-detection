import { AppConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { TokenBalanceSnapshot } from '../lib/txAnalysis.js';

export type RecheckJob = {
  mint: string;
  baselineSnapshot: TokenBalanceSnapshot;
  firstSeenMs: number;
  expiresAtMs: number;
  timeout: NodeJS.Timeout;
};

export type RecheckHandler = (mint: string, baselineSnapshot: TokenBalanceSnapshot) => Promise<void>;

export class TokenMonitor {
  private readonly config: AppConfig;
  private readonly onRecheck: RecheckHandler;
  private readonly jobs = new Map<string, RecheckJob>();

  constructor(config: AppConfig, onRecheck: RecheckHandler) {
    this.config = config;
    this.onRecheck = onRecheck;
  }

  public scheduleRecheck(mint: string, baselineSnapshot: TokenBalanceSnapshot): void {
    const now = Date.now();
    if (this.jobs.has(mint)) return;

    this.evictIfNeeded();

    const delayMs = Math.max(1, this.config.monitorRecheckMinutes) * 60_000;
    const expiresAtMs = now + Math.max(1, this.config.monitorTtlMinutes) * 60_000;

    const timeout = setTimeout(async () => {
      const job = this.jobs.get(mint);
      if (!job) return;
      if (Date.now() > job.expiresAtMs) {
        this.jobs.delete(mint);
        return;
      }

      try {
        await this.onRecheck(mint, baselineSnapshot);
      } catch (err) {
        logger.error({ err, mint }, 'Recheck job failed');
      } finally {
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

  private evictIfNeeded(): void {
    const max = Math.max(1, this.config.monitorMaxTrackedTokens);
    if (this.jobs.size < max) return;

    // Evict oldest job
    let oldest: RecheckJob | undefined;
    for (const job of this.jobs.values()) {
      if (!oldest || job.firstSeenMs < oldest.firstSeenMs) oldest = job;
    }
    if (!oldest) return;

    clearTimeout(oldest.timeout);
    this.jobs.delete(oldest.mint);
    logger.warn({ mint: oldest.mint }, 'Evicted token monitor job (max tracked tokens reached)');
  }
}
