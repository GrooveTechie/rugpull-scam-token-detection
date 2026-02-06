export type TokenEvent = {
  mint: string;
  symbol?: string;
  name?: string;
  deployer?: string;
  programId?: string;
  slot?: number;
};

export type RiskScore = {
  total: number; // 0-100
  reasons: string[];
  breakdown: Record<string, number>;
};

export type SolanaClients = {
  rpcUrl: string;
  connection: import('@solana/web3.js').Connection;
};

export type WalletNodeType = 'creator' | 'liquidity_funder' | 'mint_authority' | 'freeze_authority' | 'update_authority';

export type WalletNode = {
  address: string;
  type: WalletNodeType[];
  firstSeen?: number; // slot
};

export type WalletGraph = {
  nodes: Map<string, WalletNode>;
  mint: string;
};

export type SellEvent = {
  wallet: string;
  mint: string;
  amount: string;
  timestamp: number;
  slot: number;
  isDirect: boolean; // true if wallet is in graph, false if proxy (one hop away)
};


