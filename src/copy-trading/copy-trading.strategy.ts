import { Injectable } from '@nestjs/common';

export interface NormalizedTrade {
  tradeId: string;
  marketId: string;
  tokenID: string;
  slug?: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  /** Leader trade time (Unix seconds or ms from API); used for latency calculation */
  leaderTradeTimestamp?: number;
  /** When we received the trade (activity fetch completed) */
  fetchedAt?: Date;
}

export interface StrategyDecision {
  shouldTrade: boolean;
  side?: 'BUY' | 'SELL';
  size?: number;
  reason: string;
}

@Injectable()
export class CopyTradingStrategy {
  private get minSignalSize(): number {
    return Number(process.env.MIN_SIGNAL_SIZE ?? 5);
  }

  private get maxPositionSize(): number {
    return Number(process.env.MAX_POSITION_SIZE ?? 5);
  }

  decide(params: {
    leaderNetChange: number;
    botCurrentPosition: number;
    trade: NormalizedTrade;
  }): StrategyDecision {
    const { leaderNetChange, botCurrentPosition } = params;

    if (Math.abs(leaderNetChange) < this.minSignalSize) {
      return {
        shouldTrade: false,
        reason: 'Leader change too small (rebalance)',
      };
    }

    const side: 'BUY' | 'SELL' = leaderNetChange > 0 ? 'BUY' : 'SELL';

    if (
      (side === 'BUY' && botCurrentPosition > 0) ||
      (side === 'SELL' && botCurrentPosition < 0)
    ) {
      return {
        shouldTrade: false,
        reason: 'Bot already aligned',
      };
    }

    return {
      shouldTrade: true,
      side,
      size: this.maxPositionSize,
      reason: 'Leader showed meaningful intent',
    };
  }
}
