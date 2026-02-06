import { SolanaClients, TokenEvent, RiskScore } from '../types.js';
import { runProgramUpgradeAuthorityCheck, runTokenAuthorityChecks } from '../checks/tokenChecks.js';
import { runLiquidityChecks } from '../checks/liquidityChecks.js';

type AuthorityState = {
  mintAuthorityPresent: boolean;
  freezeAuthorityPresent: boolean;
  upgradeAuthorityPresent: boolean | null;
};

type AuthorityHistory = {
  firstSeenMs: number;
  baseline: AuthorityState;
  mutationDetected: boolean;
};

type ScoreOptions = {
  authorityPersistenceMinutes?: number;
  nowMs?: number;
};

const authorityHistoryByMint = new Map<string, AuthorityHistory>();

export async function scoreTokenRisk(
  clients: SolanaClients,
  evt: TokenEvent,
  options: ScoreOptions = {}
): Promise<RiskScore> {
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

  const upgrade = await runProgramUpgradeAuthorityCheck(clients.connection, evt.programId);
  const authorityState: AuthorityState = {
    mintAuthorityPresent: token.hasMintAuthority,
    freezeAuthorityPresent: token.hasFreezeAuthority,
    upgradeAuthorityPresent: upgrade.hasUpgradeAuthority
  };

  const nowMs = options.nowMs ?? Date.now();
  const history = authorityHistoryByMint.get(evt.mint);
  if (history === undefined) {
    authorityHistoryByMint.set(evt.mint, {
      firstSeenMs: nowMs,
      baseline: authorityState,
      mutationDetected: false
    });
  } else {
    if (!history.mutationDetected && hasAuthorityMutation(history.baseline, authorityState)) {
      history.mutationDetected = true;
      breakdown.authorityMutationAfterLaunch = 80;
      total += 80;
      reasons.push('Critical: authority changed after launch');
    }

    const persistenceMinutes = options.authorityPersistenceMinutes ?? 15;
    const hasAnyAuthority = authorityState.mintAuthorityPresent || authorityState.freezeAuthorityPresent || authorityState.upgradeAuthorityPresent === true;
    const aliveMs = nowMs - history.firstSeenMs;

    if (hasAnyAuthority && aliveMs >= persistenceMinutes * 60 * 1000) {
      breakdown.authorityStillPresentPenalty = 10;
      total += 10;
      reasons.push(`Authority still present after ${persistenceMinutes}m`);
    }
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

  return { total: Math.min(100, total), reasons, breakdown };
}

function hasAuthorityMutation(previous: AuthorityState, next: AuthorityState): boolean {
  return previous.mintAuthorityPresent !== next.mintAuthorityPresent
    || previous.freezeAuthorityPresent !== next.freezeAuthorityPresent
    || previous.upgradeAuthorityPresent !== next.upgradeAuthorityPresent;
}
