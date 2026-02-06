import { PublicKey } from '@solana/web3.js';
import { logger } from '../lib/logger.js';
// Minimal viable watcher using logsSubscribe (can be extended per DEX)
export async function runNewTokenWatcher({ clients, programIds, onTokenDetected }) {
    const { connection } = clients;
    const filters = programIds
        .map((id) => {
        try {
            return { mentions: [new PublicKey(id).toBase58()] };
        }
        catch (err) {
            logger.warn({ id, err }, 'Invalid PROGRAM_ID, skipping');
            return null;
        }
    })
        .filter(Boolean);
    if (filters.length === 0) {
        logger.warn('No PROGRAM_IDS configured. The watcher will not receive events.');
    }
    const sub = await connection.onLogs('all', async (logs, ctx) => {
        try {
            const programId = logs.programId?.toBase58?.();
            const mint = extractPossibleMintFromLogs(logs.logs);
            if (!mint)
                return;
            const evt = {
                mint,
                programId,
                slot: ctx.slot
            };
            await onTokenDetected(evt);
        }
        catch (err) {
            logger.error({ err }, 'Error handling log event');
        }
    }, 'confirmed');
    logger.info({ sub }, 'Logs watcher subscribed');
}
function extractPossibleMintFromLogs(lines) {
    for (const line of lines) {
        const m = line.match(/mint\s*[:=]\s*([1-9A-HJ-NP-Za-km-z]{32,44})/);
        if (m?.[1])
            return m[1];
    }
    return undefined;
}
//# sourceMappingURL=newTokenWatcher.js.map