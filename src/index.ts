import { loadConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { createSolanaClients } from './lib/solana.js';
import { runNewTokenWatcher } from './watchers/newTokenWatcher.js';
import { scoreTokenRisk } from './scoring/riskScoring.js';
import { sendDiscordAlert } from './services/discord.js';
import { sendTelegramAlert } from './services/telegram.js';
import { TokenEvent } from './types.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const clients = await createSolanaClients({ rpcEndpoints: config.rpcEndpoints, wsEndpoint: config.wsEndpoint });

  logger.info({ endpoints: config.rpcEndpoints }, 'Rugpull detector starting');

  const watchedTokens = new Map<string, TokenEvent>();
  const highestAlertedScoreByMint = new Map<string, number>();

  const evaluateAndAlert = async (evt: TokenEvent): Promise<void> => {
    const score = await scoreTokenRisk(clients, evt, {
      authorityPersistenceMinutes: config.authorityPersistenceMinutes
    });

    logger.info({ mint: evt.mint, score }, 'Risk score computed');

    const hasCriticalAuthorityMutation = score.breakdown.authorityMutationAfterLaunch !== undefined;
    const shouldAlert = score.total >= config.riskAlertThreshold || hasCriticalAuthorityMutation;
    if (!shouldAlert) {
      return;
    }

    const highestAlertedScore = highestAlertedScoreByMint.get(evt.mint) ?? -1;
    if (score.total <= highestAlertedScore && !hasCriticalAuthorityMutation) {
      return;
    }

    highestAlertedScoreByMint.set(evt.mint, Math.max(highestAlertedScore, score.total));

    const title = `RugWatch Alert: ${evt.symbol ?? evt.mint}`;
    const msg = `Risk Score: ${score.total}\nMint: ${evt.mint}\nReason: ${score.reasons.join('; ')}`;
    await Promise.all([
      sendTelegramAlert(config, `"${title}"\n${msg}`),
      sendDiscordAlert(config, title, msg)
    ]);
  };

  const intervalMs = Math.max(10, config.authorityMonitorIntervalSeconds) * 1000;
  setInterval(() => {
    for (const evt of watchedTokens.values()) {
      void evaluateAndAlert(evt).catch((err) => {
        logger.error({ err, mint: evt.mint }, 'Failed authority monitoring cycle');
      });
    }
  }, intervalMs);

  await runNewTokenWatcher({
    clients,
    programIds: config.programIds,
    onTokenDetected: async (evt: TokenEvent) => {
      try {
        watchedTokens.set(evt.mint, evt);
        await evaluateAndAlert(evt);
      } catch (err) {
        logger.error({ err, mint: evt.mint }, 'Failed processing token event');
      }
    }
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error in main');
  process.exit(1);
});
