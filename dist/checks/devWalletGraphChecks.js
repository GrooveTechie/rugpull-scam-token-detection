import { RpcBudget } from '../lib/rpcBudget.js';
import { computeDropPct, extractSplTokenTransfersFromParsedTx, getRecentParsedTransactions, getTokenAccountOwnerCached, getTokenBalancesByOwners, rawToPctOfSupply } from '../lib/txAnalysis.js';
function uniq(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function clampInt(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    return Math.max(min, Math.min(max, Math.floor(value)));
}
export async function buildDevLinkedWalletGraph(connection, mint, seeds, config, budget) {
    const lookbackMs = clampInt(config.devGraphLookbackMinutes, 1, 24 * 60) * 60_000;
    const maxWallets = clampInt(config.devGraphMaxWallets, 1, 500);
    const depth = clampInt(config.devGraphDepth, 1, 5);
    const seedWallets = uniq(seeds);
    const wallets = [];
    const edges = [];
    const walletSet = new Set();
    for (const s of seedWallets) {
        walletSet.add(s);
        wallets.push(s);
    }
    const ownerCache = new Map();
    let truncated = false;
    const queue = seedWallets.map((w) => ({ wallet: w, d: 0 }));
    while (queue.length > 0) {
        const next = queue.shift();
        if (!next)
            break;
        const { wallet, d } = next;
        if (d >= depth)
            continue;
        if (walletSet.size >= maxWallets) {
            truncated = true;
            break;
        }
        let txs = [];
        try {
            txs = await getRecentParsedTransactions(connection, wallet, lookbackMs, 20, budget);
        }
        catch {
            continue;
        }
        for (const tx of txs) {
            const transfers = extractSplTokenTransfersFromParsedTx(tx);
            for (const t of transfers) {
                if (!t.mint || t.mint !== mint)
                    continue;
                // Only treat as dev-link edge if the wallet is the authority/signing wallet.
                if (!t.authority || t.authority !== wallet)
                    continue;
                if (!t.destination)
                    continue;
                const destInfo = await getTokenAccountOwnerCached(connection, t.destination, ownerCache, budget);
                if (!destInfo.owner)
                    continue;
                edges.push({
                    from: wallet,
                    to: destInfo.owner,
                    kind: 'tokenTransfer',
                    signature: tx?.transaction?.signatures?.[0],
                    slot: tx?.slot,
                    tsMs: (tx?.blockTime ?? 0) * 1000,
                    amountRaw: t.amountRaw
                });
                if (!walletSet.has(destInfo.owner)) {
                    walletSet.add(destInfo.owner);
                    wallets.push(destInfo.owner);
                    if (walletSet.size < maxWallets) {
                        queue.push({ wallet: destInfo.owner, d: d + 1 });
                    }
                    else {
                        truncated = true;
                    }
                }
                if (walletSet.size >= maxWallets) {
                    truncated = true;
                    break;
                }
            }
            if (truncated)
                break;
        }
        if (truncated)
            break;
    }
    const budgetStats = budget.getStats();
    if (budgetStats.truncated)
        truncated = true;
    return {
        seeds: seedWallets,
        wallets: uniq(wallets).slice(0, maxWallets),
        edges,
        truncated
    };
}
export async function takeTokenBalanceSnapshot(connection, mint, decimals, supplyRaw, wallets, budget) {
    const balances = await getTokenBalancesByOwners(connection, wallets, mint, 'confirmed', budget);
    const balancesRawByWallet = {};
    for (const [wallet, b] of Object.entries(balances)) {
        balancesRawByWallet[wallet] = b.amountRaw.toString();
    }
    return {
        atMs: Date.now(),
        mint,
        decimals,
        supplyRaw,
        balancesRawByWallet
    };
}
function computeDirectSellEvents(baseline, current, config) {
    const minDropPct = config.sellMinTokenDropPct;
    const minSupplyPct = config.sellMinSupplyPct;
    const out = [];
    for (const [wallet, baseRawStr] of Object.entries(baseline.balancesRawByWallet)) {
        const currRawStr = current.balancesRawByWallet[wallet] ?? '0';
        let base = 0n;
        let curr = 0n;
        try {
            base = BigInt(baseRawStr);
            curr = BigInt(currRawStr);
        }
        catch {
            continue;
        }
        if (base <= 0n)
            continue;
        if (curr >= base)
            continue;
        const dropRaw = base - curr;
        const dropPct = computeDropPct(base, curr);
        const supplyPct = rawToPctOfSupply(dropRaw, baseline.supplyRaw);
        if (dropPct >= minDropPct && supplyPct >= minSupplyPct) {
            out.push({
                wallet,
                kind: 'direct',
                supplyPct,
                tokenDropPct: dropPct,
                note: `Token balance dropped ${dropPct}% (~${supplyPct}% of supply)`
            });
        }
    }
    return out;
}
export async function runDevSellAnalysis(connection, params) {
    const { config } = params;
    const budget = new RpcBudget(config.monitorRpcBudgetPerToken);
    const graph = config.devGraphEnabled
        ? await buildDevLinkedWalletGraph(connection, params.mint, params.seeds, config, budget)
        : { seeds: uniq(params.seeds), wallets: uniq(params.seeds), edges: [], truncated: false };
    const devLinkedWallets = uniq(graph.wallets);
    const snapshot = await takeTokenBalanceSnapshot(connection, params.mint, params.decimals, params.supplyRaw, devLinkedWallets, budget);
    const sellEvents = [];
    let directSellDetected = false;
    let proxySellDetected = false;
    let movementWithoutSellDetected = false;
    if (params.evaluation === 'recheck' && params.baselineSnapshot) {
        const direct = computeDirectSellEvents(params.baselineSnapshot, snapshot, config);
        if (direct.length > 0) {
            directSellDetected = true;
            sellEvents.push(...direct);
        }
        // Proxy heuristic v1: if a dev-linked wallet transferred tokens to a non-dev wallet and that wallet
        // now has a large drop vs received amount, mark proxy.
        // For v1 we approximate by: any non-seed wallet with balance drop >= minDropPct AND it has an inbound edge.
        const minDropPct = config.sellMinTokenDropPct;
        const inboundRecipients = new Set();
        for (const e of graph.edges)
            inboundRecipients.add(e.to);
        for (const recipient of inboundRecipients) {
            if (params.baselineSnapshot.balancesRawByWallet[recipient] === undefined)
                continue;
            const baseRawStr = params.baselineSnapshot.balancesRawByWallet[recipient];
            const currRawStr = snapshot.balancesRawByWallet[recipient] ?? baseRawStr;
            let base = 0n;
            let curr = 0n;
            try {
                base = BigInt(baseRawStr);
                curr = BigInt(currRawStr);
            }
            catch {
                continue;
            }
            const dropPct = computeDropPct(base, curr);
            if (dropPct >= minDropPct && base > curr) {
                proxySellDetected = true;
                sellEvents.push({
                    wallet: recipient,
                    kind: 'proxy',
                    tokenDropPct: dropPct,
                    note: `Recipient wallet balance dropped ${dropPct}% after receiving from dev-linked wallet(s)`
                });
            }
        }
        // Movement without sell: any dev-linked wallet decreased but did not hit direct/proxy thresholds.
        if (!directSellDetected && !proxySellDetected) {
            for (const [wallet, baseRawStr] of Object.entries(params.baselineSnapshot.balancesRawByWallet)) {
                const currRawStr = snapshot.balancesRawByWallet[wallet] ?? '0';
                let base = 0n;
                let curr = 0n;
                try {
                    base = BigInt(baseRawStr);
                    curr = BigInt(currRawStr);
                }
                catch {
                    continue;
                }
                if (base > curr) {
                    movementWithoutSellDetected = true;
                    break;
                }
            }
        }
    }
    const truncated = graph.truncated || budget.getStats().truncated;
    const result = {
        graph,
        directSellDetected,
        proxySellDetected,
        movementWithoutSellDetected,
        sellEvents,
        devLinkedWallets,
        truncated
    };
    return { result, snapshot };
}
//# sourceMappingURL=devWalletGraphChecks.js.map