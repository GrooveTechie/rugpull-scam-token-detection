import { Connection, clusterApiUrl } from '@solana/web3.js';
export async function createSolanaClients(params) {
    const rpcUrl = params.rpcEndpoints[0] ?? clusterApiUrl('mainnet-beta');
    const connection = new Connection(rpcUrl, {
        wsEndpoint: params.wsEndpoint,
        commitment: params.commitment ?? 'confirmed'
    });
    return { rpcUrl, connection };
}
//# sourceMappingURL=solana.js.map