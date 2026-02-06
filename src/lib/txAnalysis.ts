import { Connection, PublicKey } from '@solana/web3.js';
import { RpcBudget } from './rpcBudget.js';

export type TokenBalanceSnapshot = {
  atMs: number;
  mint: string;
  decimals: number;
  supplyRaw: string;
  balancesRawByWallet: Record<string, string>;
};

function parseBigIntSafe(value: string | undefined): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export function rawToPctOfSupply(raw: bigint, supplyRaw: string): number {
  const supply = parseBigIntSafe(supplyRaw);
  if (supply <= 0n) return 0;
  // pct = raw / supply * 100
  return Number((raw * 10000n) / supply) / 100;
}

export async function getTokenBalancesByOwners(
  connection: Connection,
  owners: string[],
  mintStr: string,
  commitment: Parameters<Connection['getParsedTokenAccountsByOwner']>[2] = 'confirmed',
  budget?: RpcBudget
): Promise<Record<string, { amountRaw: bigint; decimals: number }>> {
  const mint = new PublicKey(mintStr);
  const out: Record<string, { amountRaw: bigint; decimals: number }> = {};

  for (const ownerStr of owners) {
    if (budget && !budget.tryConsume('getParsedTokenAccountsByOwner')) break;

    try {
      const owner = new PublicKey(ownerStr);
      const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint }, commitment);
      let sum = 0n;
      let decimals = 0;
      for (const acc of resp.value) {
        const info: any = (acc.account.data as any)?.parsed?.info;
        const tokenAmount = info?.tokenAmount;
        const amountRaw = parseBigIntSafe(tokenAmount?.amount);
        sum += amountRaw;
        decimals = typeof tokenAmount?.decimals === 'number' ? tokenAmount.decimals : decimals;
      }
      out[ownerStr] = { amountRaw: sum, decimals };
    } catch {
      out[ownerStr] = { amountRaw: 0n, decimals: 0 };
    }
  }

  return out;
}

export type ParsedTokenTransfer = {
  authority?: string;
  source?: string;
  destination?: string;
  amountRaw?: string;
  mint?: string;
};

export function extractSplTokenTransfersFromParsedTx(parsedTx: any): ParsedTokenTransfer[] {
  const instructions: any[] = parsedTx?.transaction?.message?.instructions ?? [];
  const out: ParsedTokenTransfer[] = [];

  for (const ix of instructions) {
    const parsed = ix?.parsed;
    if (!parsed) continue;
    if (ix?.program !== 'spl-token') continue;

    const type = parsed?.type;
    const info = parsed?.info ?? {};

    if (type === 'transfer' || type === 'transferChecked') {
      out.push({
        authority: info.authority,
        source: info.source,
        destination: info.destination,
        amountRaw: info.amount,
        mint: info.mint
      });
    }
  }

  return out;
}

export type TokenAccountOwnerInfo = {
  owner?: string;
  mint?: string;
};

export async function getTokenAccountOwnerCached(
  connection: Connection,
  tokenAccountStr: string,
  cache: Map<string, TokenAccountOwnerInfo>,
  budget?: RpcBudget
): Promise<TokenAccountOwnerInfo> {
  const cached = cache.get(tokenAccountStr);
  if (cached) return cached;

  if (budget && !budget.tryConsume('getParsedAccountInfo')) {
    const fallback: TokenAccountOwnerInfo = {};
    cache.set(tokenAccountStr, fallback);
    return fallback;
  }

  try {
    const tokenAccount = new PublicKey(tokenAccountStr);
    const info = await connection.getParsedAccountInfo(tokenAccount, 'confirmed');
    const parsed: any = (info.value?.data as any)?.parsed;
    const out: TokenAccountOwnerInfo = {
      owner: parsed?.info?.owner,
      mint: parsed?.info?.mint
    };
    cache.set(tokenAccountStr, out);
    return out;
  } catch {
    const out: TokenAccountOwnerInfo = {};
    cache.set(tokenAccountStr, out);
    return out;
  }
}

export async function getRecentParsedTransactions(
  connection: Connection,
  addressStr: string,
  lookbackMs: number,
  limit: number,
  budget?: RpcBudget
): Promise<any[]> {
  const address = new PublicKey(addressStr);
  if (budget && !budget.tryConsume('getSignaturesForAddress')) return [];

  const sigs = await connection.getSignaturesForAddress(address, { limit }, 'confirmed');
  const now = Date.now();
  const out: any[] = [];

  for (const s of sigs) {
    const blockTimeMs = (s.blockTime ?? 0) * 1000;
    if (blockTimeMs > 0 && now - blockTimeMs > lookbackMs) continue;
    if (budget && !budget.tryConsume('getParsedTransaction')) {
      budget.markTruncated('getParsedTransaction budget exceeded');
      break;
    }
    const tx = await connection.getParsedTransaction(s.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    if (tx) out.push(tx);
  }

  return out;
}

export function computeDropPct(baselineRaw: bigint, currentRaw: bigint): number {
  if (baselineRaw <= 0n) return 0;
  const drop = baselineRaw > currentRaw ? baselineRaw - currentRaw : 0n;
  return Number((drop * 10000n) / baselineRaw) / 100;
}
