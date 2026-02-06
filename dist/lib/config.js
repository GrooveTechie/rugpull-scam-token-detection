import dotenv from 'dotenv';
dotenv.config();
export function loadConfig() {
    const rpcEndpointsRaw = process.env.RPC_ENDPOINTS ?? '';
    const rpcEndpoints = rpcEndpointsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (rpcEndpoints.length === 0) {
        throw new Error('RPC_ENDPOINTS is required');
    }
    const programIds = (process.env.PROGRAM_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const riskAlertThreshold = Number(process.env.RISK_SCORE_ALERT_THRESHOLD ?? '70');
    const simBuySol = Number(process.env.SIM_BUY_SOL ?? '0.01');
    const monitorRecheckMinutes = Number(process.env.MONITOR_RECHECK_MINUTES ?? '15');
    const monitorMaxTrackedTokens = Number(process.env.MONITOR_MAX_TRACKED_TOKENS ?? '200');
    const monitorTtlMinutes = Number(process.env.MONITOR_TTL_MINUTES ?? '120');
    const monitorRpcBudgetPerToken = Number(process.env.MONITOR_RPC_BUDGET_PER_TOKEN ?? '50');
    const alertDedupeTtlMinutes = Number(process.env.ALERT_DEDUPE_TTL_MINUTES ?? '30');
    const alertResendScoreDelta = Number(process.env.ALERT_RESEND_SCORE_DELTA ?? '10');
    const devGraphEnabled = (process.env.DEV_GRAPH_ENABLED ?? 'true').toLowerCase() === 'true';
    const devGraphLookbackMinutes = Number(process.env.DEV_GRAPH_LOOKBACK_MINUTES ?? '30');
    const devGraphMaxWallets = Number(process.env.DEV_GRAPH_MAX_WALLETS ?? '50');
    const devGraphDepth = Number(process.env.DEV_GRAPH_DEPTH ?? '2');
    const sellDetectionEnabled = (process.env.SELL_DETECTION_ENABLED ?? 'true').toLowerCase() === 'true';
    const sellLookbackMinutes = Number(process.env.SELL_LOOKBACK_MINUTES ?? '15');
    const sellMinTokenDropPct = Number(process.env.SELL_MIN_TOKEN_DROP_PCT ?? '20');
    const sellMinSupplyPct = Number(process.env.SELL_MIN_SUPPLY_PCT ?? '0.25');
    const proxyWindowMinutes = Number(process.env.PROXY_WINDOW_MINUTES ?? '10');
    const proxyMaxHops = Number(process.env.PROXY_MAX_HOPS ?? '1');
    const sellDevWeight = Number(process.env.SELL_DEV_WEIGHT ?? '25');
    const sellProxyWeight = Number(process.env.SELL_PROXY_WEIGHT ?? '20');
    const sellMovementNoSellWeight = Number(process.env.SELL_MOVEMENT_NO_SELL_WEIGHT ?? '10');
    return {
        rpcEndpoints,
        wsEndpoint: process.env.WS_ENDPOINT || undefined,
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
        telegramChatId: process.env.TELEGRAM_CHAT_ID || undefined,
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
        riskAlertThreshold,
        programIds,
        simBuySol,
        monitorRecheckMinutes,
        monitorMaxTrackedTokens,
        monitorTtlMinutes,
        monitorRpcBudgetPerToken,
        alertDedupeTtlMinutes,
        alertResendScoreDelta,
        devGraphEnabled,
        devGraphLookbackMinutes,
        devGraphMaxWallets,
        devGraphDepth,
        sellDetectionEnabled,
        sellLookbackMinutes,
        sellMinTokenDropPct,
        sellMinSupplyPct,
        proxyWindowMinutes,
        proxyMaxHops,
        sellDevWeight,
        sellProxyWeight,
        sellMovementNoSellWeight
    };
}
//# sourceMappingURL=config.js.map