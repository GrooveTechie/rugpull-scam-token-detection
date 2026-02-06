import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
export async function runTokenAuthorityChecks(connection, mintStr) {
    try {
        const mint = new PublicKey(mintStr);
        const info = await getMint(connection, mint, 'confirmed');
        return {
            hasMintAuthority: info.mintAuthority !== null,
            hasFreezeAuthority: info.freezeAuthority !== null,
            decimals: info.decimals,
            supply: info.supply.toString()
        };
    }
    catch (err) {
        // Return safe defaults for invalid/uninitialized mint accounts
        return {
            hasMintAuthority: false,
            hasFreezeAuthority: false,
            decimals: 0,
            supply: '0'
        };
    }
}
export async function runProgramUpgradeAuthorityCheck(connection, programId) {
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
        const parsed = parsedInfo.parsed;
        const authority = parsed?.info?.authority;
        if (authority === undefined) {
            return { hasUpgradeAuthority: null };
        }
        return {
            hasUpgradeAuthority: authority !== null,
            upgradeAuthority: authority ?? undefined
        };
    }
    catch (err) {
        return { hasUpgradeAuthority: null };
    }
}
//# sourceMappingURL=tokenChecks.js.map