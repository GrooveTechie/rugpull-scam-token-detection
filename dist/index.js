import { loadConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { createSolanaClients } from './lib/solana.js';
import { runNewTokenWatcher } from './watchers/newTokenWatcher.js';
import { scoreTokenRisk } from './scoring/riskScoring.js';
import { sendDiscordAlert } from './services/discord.js';
import { sendTelegramAlert } from './services/telegram.js';
import { AlertManager } from './services/alertManager.js';
import { TokenMonitor } from './monitoring/tokenMonitor.js';
async function main() {
    const config = loadConfig();
    const clients = await createSolanaClients({ rpcEndpoints: config.rpcEndpoints, wsEndpoint: config.wsEndpoint });
    const alertManager = new AlertManager(config);
    const tokenMonitor = new TokenMonitor(config, async (mint, baselineSnapshot) => {
        const evt = { mint, detectedAtMs: baselineSnapshot.atMs };
        const { score } = await scoreTokenRisk(clients, evt, config, { evaluation: 'recheck', baselineSnapshot });
        logger.info({ mint, score }, 'Risk score computed (recheck)');
        const decision = alertManager.shouldSend(mint, score);
        if (!decision.send)
            return;
        const title = `RugWatch Recheck: ${evt.symbol ?? evt.mint}`;
        const msg = `Risk Score: ${score.total}\nMint: ${mint}\nReason: ${score.reasons.join('; ')}`;
        await Promise.all([
            sendTelegramAlert(config, `${title}\n${msg}`),
            sendDiscordAlert(config, title, msg)
        ]);
    });
    logger.info({ endpoints: config.rpcEndpoints }, 'Rugpull detector starting');
    await runNewTokenWatcher({
        clients,
        programIds: config.programIds,
        onTokenDetected: async (evt) => {
            try {
                evt.detectedAtMs = evt.detectedAtMs ?? Date.now();
                const { score, snapshot } = await scoreTokenRisk(clients, evt, config, { evaluation: 'initial' });
                logger.info({ mint: evt.mint, score }, 'Risk score computed (initial)');
                if (snapshot && Object.keys(snapshot.balancesRawByWallet).length > 0) {
                    tokenMonitor.scheduleRecheck(evt.mint, snapshot);
                }
                const decision = alertManager.shouldSend(evt.mint, score);
                if (!decision.send)
                    return;
                const title = `RugWatch Alert: ${evt.symbol ?? evt.mint}`;
                const msg = `Risk Score: ${score.total}\nMint: ${evt.mint}\nReason: ${score.reasons.join('; ')}`;
                await Promise.all([
                    sendTelegramAlert(config, `${title}\n${msg}`),
                    sendDiscordAlert(config, title, msg)
                ]);
            }
            catch (err) {
                logger.error({ err, mint: evt.mint }, 'Failed processing token event');
            }
        }
    });
}
main().catch((err) => {
    logger.fatal({ err }, 'Fatal error in main');
    process.exit(1);
});
//# sourceMappingURL=index.js.map