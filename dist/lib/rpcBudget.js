export class RpcBudget {
    maxCalls;
    callsUsed = 0;
    truncated = false;
    lastReason;
    constructor(maxCalls) {
        this.maxCalls = Number.isFinite(maxCalls) && maxCalls > 0 ? Math.floor(maxCalls) : 0;
    }
    tryConsume(reason, cost = 1) {
        const normalizedCost = Math.max(1, Math.floor(cost));
        if (this.maxCalls === 0) {
            this.truncated = true;
            this.lastReason = reason;
            return false;
        }
        if (this.callsUsed + normalizedCost > this.maxCalls) {
            this.truncated = true;
            this.lastReason = reason;
            return false;
        }
        this.callsUsed += normalizedCost;
        this.lastReason = reason;
        return true;
    }
    markTruncated(reason) {
        this.truncated = true;
        this.lastReason = reason;
    }
    getStats() {
        return {
            maxCalls: this.maxCalls,
            callsUsed: this.callsUsed,
            truncated: this.truncated,
            lastReason: this.lastReason
        };
    }
}
//# sourceMappingURL=rpcBudget.js.map