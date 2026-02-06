export type TokenEvent = {
  mint: string;
  symbol?: string;
  name?: string;
  deployer?: string;
  programId?: string;
  slot?: number;
  detectedAtMs?: number;
};

export type RiskScore = {
  total: number; // 0-100
  reasons: string[];
  breakdown: Record<string, number>;
  meta?: {
    evaluation: 'initial' | 'recheck';
    truncated?: boolean;
    devLinkedWalletCount?: number;
    devLinkedWallets?: string[];
  };
};

export type DevLinkedWalletGraph = {
  seeds: string[];
  wallets: string[];
  edges: Array<{
    from: string;
    to: string;
    kind: 'tokenTransfer' | 'solFunding' | 'unknown';
    signature?: string;
    slot?: number;
    tsMs?: number;
    amountRaw?: string;
  }>;
  truncated: boolean;
};

export type SellEvent = {
  wallet: string;
  kind: 'direct' | 'proxy';
  signature?: string;
  slot?: number;
  tsMs?: number;
  supplyPct?: number;
  tokenDropPct?: number;
  viaWallets?: string[];
  note?: string;
};

export type DevSellCheckResult = {
  graph: DevLinkedWalletGraph;
  directSellDetected: boolean;
  proxySellDetected: boolean;
  movementWithoutSellDetected: boolean;
  sellEvents: SellEvent[];
  devLinkedWallets: string[];
  truncated: boolean;
};

export type SolanaClients = {
  rpcUrl: string;
  connection: import('@solana/web3.js').Connection;
};


