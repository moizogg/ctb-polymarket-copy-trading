import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolymarketClient } from 'src/clients/polymarket.client';
import { BotService } from 'src/bot/bot.service';
import { AlertsService } from 'src/alerts/alerts.service';
import { CopyTradingStrategy, NormalizedTrade } from './copy-trading.strategy';
import { BotPosition } from './entities/bot-position.entity';
import { LeaderTrade, TradeStatus } from './entities/leader-trade.entity';

@Injectable()
export class CopyTradingService {
  private readonly logger = new Logger(CopyTradingService.name);

  constructor(
    private readonly polyClient: PolymarketClient,
    private readonly strategy: CopyTradingStrategy,
    private readonly botService: BotService,
    private readonly alertsService: AlertsService,
    @InjectRepository(LeaderTrade)
    private readonly tradesRepo: Repository<LeaderTrade>,
    @InjectRepository(BotPosition)
    private readonly positionsRepo: Repository<BotPosition>,
  ) {}

  async getLeaderTrades(): Promise<LeaderTrade[]> {
    return this.tradesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getBotPositions(): Promise<BotPosition[]> {
    return this.positionsRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async handleTrade(sourceWallet: string, rawTrade: any): Promise<void> {
    const tradeId = rawTrade?.id;

    try {
      if (await this.tradeExists(tradeId)) {
        return;
      }

      const trade = this.normalizeTrade(rawTrade);
      const leaderNetChange = trade.side === 'BUY' ? trade.size : -trade.size;
      const botCurrentPosition = await this.getBotPosition(
        trade.marketId,
        trade.tokenID,
      );

      const decision = this.strategy.decide({
        leaderNetChange,
        botCurrentPosition,
        trade,
      });

      // Global kill switch — still record as SKIPPED so dashboard stays honest
      const copyEnabled = await this.botService.isCopyTradingEnabled();
      if (decision.shouldTrade && !copyEnabled) {
        await this.saveTrade(trade, sourceWallet, {
          status: TradeStatus.SKIPPED,
          reason: 'Copy trading paused (kill switch)',
        });
        this.logger.debug(
          `Skip trade ${trade.tradeId}: copy trading paused`,
        );
        return;
      }

      await this.saveTrade(trade, sourceWallet, {
        status: decision.shouldTrade
          ? TradeStatus.PENDING
          : TradeStatus.SKIPPED,
        reason: decision.reason,
      });

      if (!decision.shouldTrade) {
        this.logger.debug(
          `Skip trade ${trade.tradeId}: ${decision.reason}`,
        );
        return;
      }

      // Check if live trading credentials are ready
      const { funderAddress, apiCredsJson } = await this.botService.getDynamicCreds();
      const pk = process.env.PRIVATE_KEY?.trim() || '';
      const hasPk = !!pk && !pk.includes('your') && !pk.includes('0x_') && pk.length >= 64;
      const hasFunder = !!funderAddress && !funderAddress.includes('your') && !funderAddress.includes('0x_') && funderAddress.length === 42;
      const hasCreds = (hasPk || !!apiCredsJson) && hasFunder;

      if (!hasCreds) {
        await this.updateTradeStatus(
          trade.tradeId,
          TradeStatus.SKIPPED,
          'Live trading credentials not configured (click Link Wallet in Settings)',
        );
        this.logger.debug(
          `Skip trade ${trade.tradeId}: Live trading credentials not configured`,
        );
        return;
      }

      const executedAt = new Date();
      await this.executeTrade(trade, decision.side!, decision.size!);

      await this.updateBotPosition(trade, decision.side!, decision.size!);

      const leaderTradeAt = this.toLeaderTradeAt(trade.leaderTradeTimestamp);
      const fetchedAt = trade.fetchedAt;
      const latencyMs = leaderTradeAt
        ? Math.round(executedAt.getTime() - leaderTradeAt.getTime())
        : null;
      const fetchLatencyMs =
        leaderTradeAt && fetchedAt
          ? Math.round(fetchedAt.getTime() - leaderTradeAt.getTime())
          : null;
      const executionLatencyMs = fetchedAt
        ? Math.round(executedAt.getTime() - fetchedAt.getTime())
        : null;

      await this.updateTradeStatus(trade.tradeId, TradeStatus.COPIED, undefined, {
        copiedAt: executedAt,
        latencyMs: latencyMs ?? undefined,
        fetchLatencyMs: fetchLatencyMs ?? undefined,
        executionLatencyMs: executionLatencyMs ?? undefined,
        executedSize: decision.size!.toString(),
      });

      if (latencyMs != null) {
        this.logger.log(
          `Copy trade ${trade.tradeId} latency: ${latencyMs} ms (fetch: ${fetchLatencyMs ?? '—'} ms, execution: ${executionLatencyMs ?? '—'} ms)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed handling trade ${tradeId} from ${sourceWallet}`,
        err instanceof Error ? err.stack : undefined,
      );

      if (tradeId) {
        const message =
          err instanceof Error ? err.message : String(err ?? 'Unknown error');
        await this.updateTradeStatus(tradeId, TradeStatus.FAILED, message);
        await this.alertsService.createTradeFailureAlert(tradeId, message);
      }
    }
  }

  private async tradeExists(tradeId: string): Promise<boolean> {
    if (!tradeId) return true;
    const count = await this.tradesRepo.count({ where: { tradeId } });
    return count > 0;
  }

  private toLeaderTradeAt(ts: number | undefined): Date | null {
    if (ts == null || Number.isNaN(ts)) return null;
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms);
  }

  private async saveTrade(
    trade: NormalizedTrade,
    sourceWallet: string,
    meta?: {
      status?: TradeStatus;
      reason?: string;
    },
  ): Promise<void> {
    const exists = await this.tradeExists(trade.tradeId);
    if (exists) return;

    const leaderTradeAt = this.toLeaderTradeAt(trade.leaderTradeTimestamp);
    const entity = this.tradesRepo.create({
      tradeId: trade.tradeId,
      wallet: sourceWallet,
      marketId: trade.marketId,
      tokenId: trade.tokenID,
      slug: trade.slug ?? null,
      side: trade.side,
      size: trade.size.toString(),
      price: trade.price.toString(),
      status: meta?.status ?? TradeStatus.PENDING,
      reason: meta?.reason ?? null,
      leaderTradeAt: leaderTradeAt ?? null,
      fetchedAt: trade.fetchedAt ?? null,
    });

    try {
      await this.tradesRepo.save(entity);
    } catch (err: any) {
      // Unique violation = concurrent idempotency
      if (err?.code === '23505') return;
      throw err;
    }
  }

  private async updateTradeStatus(
    tradeId: string,
    status: TradeStatus,
    reason?: string,
    extra?: {
      copiedAt?: Date;
      latencyMs?: number;
      fetchLatencyMs?: number;
      executionLatencyMs?: number;
      executedSize?: string;
    },
  ): Promise<void> {
    const t = await this.tradesRepo.findOne({ where: { tradeId } });
    if (!t) return;
    t.status = status;
    if (reason !== undefined) t.reason = reason;
    if (extra) {
      if (extra.copiedAt !== undefined) t.copiedAt = extra.copiedAt;
      if (extra.latencyMs !== undefined) t.latencyMs = extra.latencyMs;
      if (extra.fetchLatencyMs !== undefined) {
        t.fetchLatencyMs = extra.fetchLatencyMs;
      }
      if (extra.executionLatencyMs !== undefined) {
        t.executionLatencyMs = extra.executionLatencyMs;
      }
      if (extra.executedSize !== undefined) t.executedSize = extra.executedSize;
    }
    await this.tradesRepo.save(t);
  }

  private async getBotPosition(
    marketId: string,
    tokenId: string,
  ): Promise<number> {
    const botPos = await this.positionsRepo.findOne({
      where: { marketId, tokenId },
    });
    return botPos ? Number(botPos.netSize) : 0;
  }

  private async updateBotPosition(
    trade: NormalizedTrade,
    side: 'BUY' | 'SELL',
    size: number,
  ): Promise<void> {
    let botPos = await this.positionsRepo.findOne({
      where: { marketId: trade.marketId, tokenId: trade.tokenID },
    });
    if (!botPos) {
      botPos = this.positionsRepo.create({
        marketId: trade.marketId,
        tokenId: trade.tokenID,
        netSize: '0',
      });
    }
    const delta = side === 'BUY' ? size : -size;
    botPos.netSize = (Number(botPos.netSize) + delta).toString();
    await this.positionsRepo.save(botPos);
  }

  private normalizeTrade(raw: any): NormalizedTrade {
    return {
      tradeId: raw.id,
      marketId: raw.market_id ?? raw.marketId,
      tokenID: raw.tokenID ?? raw.market_token_id,
      slug: typeof raw.slug === 'string' ? raw.slug : undefined,
      side: raw.side,
      size: Number(raw.size),
      price: Number(raw.price),
      leaderTradeTimestamp:
        raw.leaderTradeTimestamp != null
          ? Number(raw.leaderTradeTimestamp)
          : undefined,
      fetchedAt:
        raw.fetchedAt != null ? new Date(Number(raw.fetchedAt)) : undefined,
    };
  }

  private async executeTrade(
    trade: NormalizedTrade,
    side: 'BUY' | 'SELL',
    size: number,
  ) {
    const client = await this.polyClient.getClient();

    if (!trade.tokenID) {
      throw new Error('Missing tokenID');
    }

    const tickSize = process.env.DEFAULT_TICK_SIZE?.trim() || '0.01';
    const negRisk =
      process.env.DEFAULT_NEG_RISK === '1' ||
      process.env.DEFAULT_NEG_RISK?.toLowerCase() === 'true';

    this.logger.log(
      `Executing ${side} ${size} @ ${trade.price} (${trade.tokenID}) tick=${tickSize} negRisk=${negRisk}`,
    );

    await client.createAndPostOrder(
      {
        tokenID: trade.tokenID,
        side,
        price: trade.price,
        size,
      },
      {
        tickSize,
        negRisk,
      },
    );
  }
}
