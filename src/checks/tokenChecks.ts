import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

export type TokenCheckResult = {
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  decimals: number;
  supply: string;
};

export type ProgramUpgradeAuthorityResult = {
  hasUpgradeAuthority: boolean | null;
  upgradeAuthority?: string;
};

export async function runTokenAuthorityChecks(connection: Connection, mintStr: string): Promise<TokenCheckResult> {
  try {
    const mint = new PublicKey(mintStr);
    const info = await getMint(connection, mint, 'confirmed');

    return {
      hasMintAuthority: info.mintAuthority !== null,
      hasFreezeAuthority: info.freezeAuthority !== null,
      decimals: info.decimals,
      supply: info.supply.toString()
    };
  } catch (err) {
    // Return safe defaults for invalid/uninitialized mint accounts
    return {
      hasMintAuthority: false,
      hasFreezeAuthority: false,
      decimals: 0,
      supply: '0'
    };
  }
}

export async function runProgramUpgradeAuthorityCheck(
  connection: Connection,
  programId?: string
): Promise<ProgramUpgradeAuthorityResult> {
  if (programId === undefined) {
    return { hasUpgradeAuthority: null };
  }

  try {
    const programPk = new PublicKey(programId);
    const accountInfo = await connection.getParsedAccountInfo(programPk, 'confirmed');
    const parsedInfo = accountInfo.value?.data;

    if (parsedInfo === null || typeof parsedInfo !== 'object' || !('parsed' in parsedInfo)) {
      return { hasUpgradeAuthority: null };
    }

    const parsed = (parsedInfo as any).parsed;
    const authority = parsed?.info?.authority as string | null | undefined;
    if (authority === undefined) {
      return { hasUpgradeAuthority: null };
    }

    return {
      hasUpgradeAuthority: authority !== null,
      upgradeAuthority: authority ?? undefined
    };
  } catch (err) {
    return { hasUpgradeAuthority: null };
  }
}
