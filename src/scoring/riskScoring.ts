import { SolanaClients, TokenEvent, RiskScore } from '../types.js';
import { runTokenAuthorityChecks } from '../checks/tokenChecks.js';
import { runLiquidityChecks } from '../checks/liquidityChecks.js';
import { buildWalletGraph } from '../graph/walletGraph.js';
import { detectDevSells, calculateSellRisk } from '../detection/sellDetection.js';
import { logger } from '../lib/logger.js';

export async function scoreTokenRisk(clients: SolanaClients, evt: TokenEvent): Promise<RiskScore> {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];
  let total = 0;

  const token = await runTokenAuthorityChecks(clients.connection, evt.mint);
  if (token.hasMintAuthority) {
    breakdown.mintAuthorityActive = 30; total += 30; reasons.push('Mint authority active');
  }
  if (token.hasFreezeAuthority) {
    breakdown.freezeAuthorityActive = 20; total += 20; reasons.push('Freeze authority active');
  }

  // Decimals sanity
  if (token.decimals > 12 || token.decimals < 0) {
    breakdown.decimalsWeird = 5; total += 5; reasons.push(`Uncommon decimals: ${token.decimals}`);
  }

  const liq = await runLiquidityChecks(evt.mint);
  if (liq.initialLiquiditySol !== undefined && liq.initialLiquiditySol < 5) {
    breakdown.lowInitialLiquidity = 15; total += 15; reasons.push('Low initial liquidity');
  }
  if (liq.lpLocked === false) {
    breakdown.lpNotLocked = 20; total += 20; reasons.push('LP not locked');
  }

  // Wallet graph and sell detection
  try {
    const walletGraph = await buildWalletGraph(clients.connection, evt.mint);
    const devSells = await detectDevSells(clients.connection, evt.mint, walletGraph);
    
    if (devSells.length > 0) {
      const sellRisk = calculateSellRisk(devSells);
      breakdown.devSellActivity = sellRisk.score;
      total += sellRisk.score;
      reasons.push(...sellRisk.reasons);
    }
  } catch (err) {
    // Wallet graph analysis is optional, don't fail the entire scoring if it errors
    logger.debug({ err, mint: evt.mint }, 'Wallet graph analysis failed');
  }

  return { total: Math.min(100, total), reasons, breakdown };
}


