import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

export type TokenCheckResult = {
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  mintAuthority?: string;
  freezeAuthority?: string;
  decimals: number;
  supply: string;
};

export async function runTokenAuthorityChecks(connection: Connection, mintStr: string): Promise<TokenCheckResult> {
  try {
    const mint = new PublicKey(mintStr);
    const info = await getMint(connection, mint, 'confirmed');

    return {
      hasMintAuthority: info.mintAuthority !== null,
      hasFreezeAuthority: info.freezeAuthority !== null,
      mintAuthority: info.mintAuthority?.toBase58(),
      freezeAuthority: info.freezeAuthority?.toBase58(),
      decimals: info.decimals,
      supply: info.supply.toString()
    };
  } catch (err) {
    // Return safe defaults for invalid/uninitialized mint accounts
    return {
      hasMintAuthority: false,
      hasFreezeAuthority: false,
      mintAuthority: undefined,
      freezeAuthority: undefined,
      decimals: 0,
      supply: '0'
    };
  }
}


