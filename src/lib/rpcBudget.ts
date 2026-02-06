export type RpcBudgetStats = {
  maxCalls: number;
  callsUsed: number;
  truncated: boolean;
  lastReason?: string;
};

export class RpcBudget {
  private readonly maxCalls: number;
  private callsUsed = 0;
  private truncated = false;
  private lastReason?: string;

  constructor(maxCalls: number) {
    this.maxCalls = Number.isFinite(maxCalls) && maxCalls > 0 ? Math.floor(maxCalls) : 0;
  }

  public tryConsume(reason: string, cost = 1): boolean {
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

  public markTruncated(reason: string): void {
    this.truncated = true;
    this.lastReason = reason;
  }

  public getStats(): RpcBudgetStats {
    return {
      maxCalls: this.maxCalls,
      callsUsed: this.callsUsed,
      truncated: this.truncated,
      lastReason: this.lastReason
    };
  }
}
