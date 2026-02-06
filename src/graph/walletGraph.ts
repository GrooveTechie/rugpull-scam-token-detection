import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { WalletGraph, WalletNode } from '../types.js';
import { logger } from '../lib/logger.js';

// Minimum SOL transfer amount (in lamports) to consider a wallet as liquidity funder
const LIQUIDITY_FUNDER_MIN_SOL_LAMPORTS = 1_000_000_000; // 1 SOL

// Maximum pagination batches when searching for oldest signature (prevents runaway RPC calls)
const MAX_SIGNATURE_PAGINATION_BATCHES = 10;
const SIGNATURES_PER_BATCH = 1000;

/**
 * Fetch the oldest signature for an address by paginating through all signatures.
 * Solana's getSignaturesForAddress returns newest-to-oldest, so we must paginate
 * until we reach the end to find the creation transaction.
 */
async function getOldestSignature(
  connection: Connection,
  address: PublicKey
): Promise<{ signature: string; slot: number } | null> {
  let lastSignature: string | undefined;
  let oldestSig: { signature: string; slot: number } | null = null;
  let batchCount = 0;

  while (batchCount < MAX_SIGNATURE_PAGINATION_BATCHES) {
    const options: { limit: number; before?: string } = { limit: SIGNATURES_PER_BATCH };
    if (lastSignature) {
      options.before = lastSignature;
    }

    const signatures = await connection.getSignaturesForAddress(
      address,
      options,
      'confirmed'
    );

    if (signatures.length === 0) {
      break;
    }

    // Last signature in each batch is the oldest so far
    const oldest = signatures[signatures.length - 1];
    oldestSig = { signature: oldest.signature, slot: oldest.slot };
    lastSignature = oldest.signature;
    batchCount++;

    // If we got fewer than the limit, we've reached the end
    if (signatures.length < SIGNATURES_PER_BATCH) {
      break;
    }
  }

  if (batchCount >= MAX_SIGNATURE_PAGINATION_BATCHES) {
    logger.warn(
      { address: address.toBase58(), batchCount },
      'Reached max pagination limit when searching for oldest signature; creator may be inaccurate'
    );
  }

  return oldestSig;
}

/**
 * Build a wallet graph starting from token mint, identifying:
 * - Creator (deployer)
 * - Initial liquidity funder
 * - Authority wallets (mint/freeze/update)
 */
export async function buildWalletGraph(
  connection: Connection,
  mintAddress: string
): Promise<WalletGraph> {
  const graph: WalletGraph = {
    nodes: new Map(),
    mint: mintAddress
  };

  try {
    const mint = new PublicKey(mintAddress);
    
    // Get mint info for authorities
    const mintInfo = await getMint(connection, mint, 'confirmed');
    
    // Add mint authority if present
    if (mintInfo.mintAuthority) {
      addOrUpdateNode(
        graph,
        mintInfo.mintAuthority.toBase58(),
        'mintAuthority'
      );
    }
    
    // Add freeze authority if present
    if (mintInfo.freezeAuthority) {
      addOrUpdateNode(
        graph,
        mintInfo.freezeAuthority.toBase58(),
        'freezeAuthority'
      );
    }

    // Fetch the oldest (creation) transaction to identify the true creator
    const oldestSig = await getOldestSignature(connection, mint);

    if (oldestSig) {
      const tx = await connection.getParsedTransaction(
        oldestSig.signature,
        { maxSupportedTransactionVersion: 0 }
      );
      
      if (tx?.transaction.message.accountKeys?.[0]?.pubkey) {
        const creator = tx.transaction.message.accountKeys[0].pubkey.toBase58();
        addOrUpdateNode(graph, creator, 'creator', oldestSig.slot);
      }
    } else if (mintInfo.mintAuthority) {
      // Fallback: use mint authority as proxy for creator if we couldn't find creation tx
      logger.debug({ mint: mintAddress }, 'Using mint authority as creator fallback');
      addOrUpdateNode(graph, mintInfo.mintAuthority.toBase58(), 'creator');
    }

    // Attempt to identify liquidity funder by looking at recent token transfers
    await identifyLiquidityFunder(connection, mint, graph);

  } catch (err) {
    logger.warn({ err, mint: mintAddress }, 'Failed to build complete wallet graph');
  }

  return graph;
}

/**
 * Identify the initial liquidity funder by analyzing early transactions
 */
async function identifyLiquidityFunder(
  connection: Connection,
  mint: PublicKey,
  graph: WalletGraph
): Promise<void> {
  try {
    // Fetch early signatures to find liquidity addition events
    // We need to look at the earliest transactions near token creation
    const oldestSig = await getOldestSignature(connection, mint);
    if (!oldestSig) return;

    // Get signatures starting from the oldest, working forward in time
    // The 'before' parameter fetches signatures older than the given one,
    // so we fetch all signatures, then take the ones near the oldest
    const allSignatures = await connection.getSignaturesForAddress(
      mint,
      { limit: 1000 },
      'confirmed'
    );

    // Take the last 5 signatures from the array (oldest 5 transactions)
    // Since signatures are returned newest-to-oldest, we want the end of the array
    const earlySignatures = allSignatures.slice(-5).reverse();

    for (const sig of earlySignatures) {
      const tx = await connection.getParsedTransaction(
        sig.signature,
        { maxSupportedTransactionVersion: 0 }
      );

      if (!tx) continue;

      // Look for large SOL transfers which might indicate liquidity provision
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed?.type === 'transfer') {
          const info = ix.parsed.info;
          if (info.lamports && info.lamports > LIQUIDITY_FUNDER_MIN_SOL_LAMPORTS) {
            const funder = info.source;
            if (funder) {
              addOrUpdateNode(graph, funder, 'liquidityFunder', sig.slot);
              return; // Found likely funder
            }
          }
        }
      }
    }
  } catch (err) {
    logger.debug({ err }, 'Could not identify liquidity funder');
  }
}

/**
 * Add a wallet node to the graph or update existing node with new type
 */
function addOrUpdateNode(
  graph: WalletGraph,
  address: string,
  type: WalletNode['type'][number],
  slot?: number
): void {
  const existing = graph.nodes.get(address);
  
  if (existing) {
    if (!existing.type.includes(type)) {
      existing.type.push(type);
    }
  } else {
    graph.nodes.set(address, {
      address,
      type: [type],
      firstSeen: slot
    });
  }
}

/**
 * Check if a wallet address is in the graph
 */
export function isWalletInGraph(graph: WalletGraph, address: string): boolean {
  return graph.nodes.has(address);
}

/**
 * Get wallet node from graph if it exists
 */
export function getWalletNode(graph: WalletGraph, address: string): WalletNode | undefined {
  return graph.nodes.get(address);
}

