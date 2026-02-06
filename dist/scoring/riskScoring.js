import { runTokenAuthorityChecks } from '../checks/tokenChecks.js';
import { runLiquidityChecks } from '../checks/liquidityChecks.js';
import { runDevSellAnalysis } from '../checks/devWalletGraphChecks.js';
export async function scoreTokenRisk(clients, evt, config, params) {
    const breakdown = {};
    const reasons = [];
    let total = 0;
    const token = await runTokenAuthorityChecks(clients.connection, evt.mint);
    if (token.hasMintAuthority) {
        breakdown.mintAuthorityActive = 30;
        total += 30;
        reasons.push('Mint authority active');
    }
    if (token.hasFreezeAuthority) {
        breakdown.freezeAuthorityActive = 20;
        total += 20;
        reasons.push('Freeze authority active');
    }
    // Decimals sanity
    if (token.decimals > 12 || token.decimals < 0) {
        breakdown.decimalsWeird = 5;
        total += 5;
        reasons.push(`Uncommon decimals: ${token.decimals}`);
    }
    const liq = await runLiquidityChecks(evt.mint);
    if (liq.initialLiquiditySol !== undefined && liq.initialLiquiditySol < 5) {
        breakdown.lowInitialLiquidity = 15;
        total += 15;
        reasons.push('Low initial liquidity');
    }
    if (liq.lpLocked === false) {
        breakdown.lpNotLocked = 20;
        total += 20;
        reasons.push('LP not locked');
    }
    let snapshot;
    if (config.sellDetectionEnabled || config.devGraphEnabled) {
        const seeds = [evt.deployer, token.mintAuthority, token.freezeAuthority].filter(Boolean);
        const analysis = await runDevSellAnalysis(clients.connection, {
            mint: evt.mint,
            decimals: token.decimals,
            supplyRaw: token.supply,
            seeds,
            config,
            evaluation: params.evaluation,
            baselineSnapshot: params.baselineSnapshot
        });
        snapshot = analysis.snapshot;
        if (analysis.result.directSellDetected) {
            const points = Math.max(config.sellDevWeight, 80);
            breakdown.devDirectSell = points;
            total += points;
            reasons.push('Direct dev-linked sell detected');
        }
        if (analysis.result.proxySellDetected) {
            const points = Math.max(config.sellProxyWeight, 40);
            breakdown.devProxySell = points;
            total += points;
            reasons.push('Proxy sell pattern detected (dev-linked transfer then rapid exit)');
        }
        if (!analysis.result.directSellDetected && !analysis.result.proxySellDetected && analysis.result.movementWithoutSellDetected) {
            const points = Math.max(config.sellMovementNoSellWeight, 10);
            breakdown.devMovement = points;
            total += points;
            reasons.push('Dev-linked wallet movement detected (no confirmed sell)');
        }
        if (analysis.result.truncated) {
            breakdown.devAnalysisTruncated = 2;
            total += 2;
            reasons.push('Dev-linked analysis truncated (RPC budget/caps)');
        }
    }
    const score = {
        total: Math.min(100, total),
        reasons,
        breakdown,
        meta: {
            evaluation: params.evaluation,
            devLinkedWalletCount: snapshot ? Object.keys(snapshot.balancesRawByWallet).length : undefined
        }
    };
    return { score, snapshot };
}
//# sourceMappingURL=riskScoring.js.map