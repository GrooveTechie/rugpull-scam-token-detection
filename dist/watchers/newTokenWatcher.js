import { PublicKey } from '@solana/web3.js';
import { logger } from '../lib/logger.js';
// Token creation instruction signatures
const TOKEN_CREATION_SIGS = [
    'InitializeMint', // SPL token creation
    'InitializeMint2', // SPL token creation (v2)
    'CreatePool', // Liquidity pool creation
    'CreateBondingCurve', // Pump.fun bonding curve
    'Initialize', // Generic pool initialization
];
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
            // Only process logs that contain token creation signatures
            const isTokenCreation = TOKEN_CREATION_SIGS.some((sig) => logs.logs.some((line) => line.includes(sig)));
            if (!isTokenCreation)
                return;
            const programId = logs.programId?.toBase58?.();
            const mint = extractMintFromTokenCreationLogs(logs.logs);
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
    logger.info({ sub }, 'Logs watcher subscribed (token creation events only)');
}
function extractMintFromTokenCreationLogs(lines) {
    for (const line of lines) {
        // Look for "Program data:" followed by a base58 address (typical for token creation)
        // Also check for explicit "Mint:" or "mint:" patterns from token creation
        const patterns = [
            /Program data:.*?([1-9A-HJ-NP-Za-km-z]{43,44})/, // 43-44 char base58 (Solana address)
            /mint\s*[:=]\s*([1-9A-HJ-NP-Za-km-z]{43,44})/i,
            /Mint:\s*([1-9A-HJ-NP-Za-km-z]{43,44})/,
            /initialized mint\s+([1-9A-HJ-NP-Za-km-z]{43,44})/i,
        ];
        for (const pattern of patterns) {
            const m = line.match(pattern);
            if (m?.[1]) {
                // Validate it's a real base58 address
                try {
                    new PublicKey(m[1]);
                    return m[1];
                }
                catch {
                    continue;
                }
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=newTokenWatcher.js.map