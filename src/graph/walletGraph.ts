import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { WalletGraph, WalletNode } from '../types.js';
import { logger } from '../lib/logger.js';

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
        'mint_authority'
      );
    }
    
    // Add freeze authority if present
    if (mintInfo.freezeAuthority) {
      addOrUpdateNode(
        graph,
        mintInfo.freezeAuthority.toBase58(),
        'freeze_authority'
      );
    }

    // Fetch mint transaction to identify creator
    const signatures = await connection.getSignaturesForAddress(
      mint,
      { limit: 1 },
      'confirmed'
    );

    if (signatures.length > 0) {
      const tx = await connection.getParsedTransaction(
        signatures[0].signature,
        { maxSupportedTransactionVersion: 0 }
      );
      
      if (tx?.transaction.message.accountKeys?.[0]?.pubkey) {
        const creator = tx.transaction.message.accountKeys[0].pubkey.toBase58();
        addOrUpdateNode(graph, creator, 'creator', signatures[0].slot);
      }
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
    // Get recent signatures (up to 10) to find liquidity addition events
    const signatures = await connection.getSignaturesForAddress(
      mint,
      { limit: 10 },
      'confirmed'
    );

    for (const sig of signatures.slice(0, 5)) {
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
          if (info.lamports && info.lamports > 1_000_000_000) { // > 1 SOL
            const funder = info.source;
            if (funder) {
              addOrUpdateNode(graph, funder, 'liquidity_funder', sig.slot);
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


