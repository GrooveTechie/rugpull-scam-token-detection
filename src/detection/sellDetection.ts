import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { WalletGraph, SellEvent } from '../types.js';
import { isWalletInGraph } from '../graph/walletGraph.js';
import { logger } from '../lib/logger.js';

// Minimum token amount to consider as a potential proxy sell
const PROXY_SELL_MIN_AMOUNT = 1000000;

// Risk scoring constants
const DIRECT_SELL_SCORE_PER_EVENT = 15;
const MAX_DIRECT_SELL_SCORE = 25;
const PROXY_SELL_SCORE_PER_EVENT = 5;
const MAX_PROXY_SELL_SCORE = 10;

// Type for parsed instruction info that may contain transfer data
type TransferInfo = {
  mint?: string;
  source?: string;
  authority?: string;
  amount?: string;
  tokenAmount?: {
    amount?: string;
  };
};

/**
 * Detect sell events from dev-linked wallets
 * Checks both direct sells (from wallets in graph) and proxy sells (one hop away)
 */
export async function detectDevSells(
  connection: Connection,
  mintAddress: string,
  graph: WalletGraph,
  lookbackLimit: number = 20
): Promise<SellEvent[]> {
  const sellEvents: SellEvent[] = [];

  try {
    const mint = new PublicKey(mintAddress);
    
    // Get recent transactions for this token
    const signatures = await connection.getSignaturesForAddress(
      mint,
      { limit: lookbackLimit },
      'confirmed'
    );

    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(
        sig.signature,
        { maxSupportedTransactionVersion: 0 }
      );

      if (!tx) continue;

      // Analyze transaction for sell events
      const sells = analyzeTxForSells(tx, mintAddress, graph, sig.slot);
      sellEvents.push(...sells);
    }
  } catch (err) {
    logger.warn({ err, mint: mintAddress }, 'Failed to detect dev sells');
  }

  return sellEvents;
}

/**
 * Analyze a transaction to identify sell events
 */
function analyzeTxForSells(
  tx: ParsedTransactionWithMeta,
  mintAddress: string,
  graph: WalletGraph,
  slot: number
): SellEvent[] {
  const sells: SellEvent[] = [];

  try {
    const instructions = tx.transaction.message.instructions;
    
    for (const ix of instructions) {
      // Look for token transfer instructions that might indicate sells
      if ('parsed' in ix && ix.parsed?.type === 'transfer') {
        const info = ix.parsed.info;
        
        // Check if this is a token transfer (not SOL)
        if (info.mint === mintAddress || info.authority) {
          const source = info.source || info.authority;
          
          if (source) {
            // Check if source wallet is in graph (direct sell)
            const isDirect = isWalletInGraph(graph, source);
            
            // For proxy detection, we would need to check if source
            // has recent transactions with wallets in graph
            // For simplicity, we'll mark as proxy if not direct
            // but has large transaction volume (placeholder logic)
            
            if (isDirect || shouldCheckAsProxy(info)) {
              // Skip if timestamp is unavailable
              if (!tx.blockTime) {
                logger.debug({ slot }, 'Skipping sell event: blockTime unavailable');
                continue;
              }
              
              sells.push({
                wallet: source,
                mint: mintAddress,
                amount: info.amount || info.tokenAmount?.amount || '0',
                timestamp: tx.blockTime,
                slot,
                isDirect
              });
            }
          }
        }
      }
      
      // Also check for swap instructions (Jupiter, Raydium, etc.)
      if ('parsed' in ix && ix.program === 'spl-token' && ix.parsed?.type === 'transferChecked') {
        const info = ix.parsed.info;
        
        if (info.mint === mintAddress) {
          const source = info.authority || info.source;
          
          if (source) {
            const isDirect = isWalletInGraph(graph, source);
            
            if (isDirect) {
              // Skip if timestamp is unavailable
              if (!tx.blockTime) {
                logger.debug({ slot }, 'Skipping sell event: blockTime unavailable');
                continue;
              }
              
              sells.push({
                wallet: source,
                mint: mintAddress,
                amount: info.tokenAmount?.amount || '0',
                timestamp: tx.blockTime,
                slot,
                isDirect: true
              });
            }
          }
        }
      }
    }
  } catch (err) {
    logger.debug({ err }, 'Error analyzing transaction for sells');
  }

  return sells;
}

/**
 * Determine if a wallet should be checked as a proxy based on transfer info
 * Checks for large token transfers that might indicate proxy sells
 */
function shouldCheckAsProxy(info: TransferInfo): boolean {
  // Simple heuristic: large transfers might be proxy sells
  const amount = parseInt(info.amount || info.tokenAmount?.amount || '0');
  return amount > PROXY_SELL_MIN_AMOUNT;
}

/**
 * Calculate risk contribution from detected sells
 */
export function calculateSellRisk(sells: SellEvent[]): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  const directSells = sells.filter(s => s.isDirect);
  const proxySells = sells.filter(s => !s.isDirect);

  // Direct sells from dev wallets are high risk
  if (directSells.length > 0) {
    const directScore = Math.min(MAX_DIRECT_SELL_SCORE, directSells.length * DIRECT_SELL_SCORE_PER_EVENT);
    score += directScore;
    reasons.push(`${directSells.length} direct sell(s) from dev-linked wallets`);
  }

  // Proxy sells are moderate risk
  if (proxySells.length > 0) {
    const proxyScore = Math.min(MAX_PROXY_SELL_SCORE, proxySells.length * PROXY_SELL_SCORE_PER_EVENT);
    score += proxyScore;
    reasons.push(`${proxySells.length} potential proxy sell(s)`);
  }

  return { score, reasons };
}

