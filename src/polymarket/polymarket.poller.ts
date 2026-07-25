import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { CopyTradingService } from 'src/copy-trading/copy-trading.service';
import { FollowedWallet } from 'src/followed-wallets/entity/followed-wallet.entity';
import { FollowedWalletsService } from 'src/followed-wallets/followed-wallets.service';
import { BotService } from 'src/bot/bot.service';
import {
  PolymarketService,
  PolymarketActivityItem,
} from './polymarket.service';

@Injectable()
export class PolymarketPoller implements OnModuleInit {
  private readonly logger = new Logger(PolymarketPoller.name);
  private polling = false;

  constructor(
    private readonly copyService: CopyTradingService,
    private readonly followedWallets: FollowedWalletsService,
    private readonly polymarketService: PolymarketService,
    private readonly botService: BotService,
  ) {}

  private activityTradeId(a: PolymarketActivityItem): string {
    return `${a.timestamp}-${a.transactionHash}-${a.asset}`;
  }

  private activityToRawTrade(
    a: PolymarketActivityItem,
    fetchedAt: Date,
  ): Record<string, unknown> {
    return {
      id: this.activityTradeId(a),
      marketId: a.conditionId,
      tokenID: a.asset,
      slug: a.slug,
      side: a.side,
      size: a.size,
      price: a.price,
      leaderTradeTimestamp: a.timestamp,
      fetchedAt: fetchedAt.getTime(),
    };
  }

  async onModuleInit() {
    await this.logLatestTradesForTest();
  }

  private async logLatestTradesForTest() {
    const wallets = await this.followedWallets.findActive();
    if (wallets.length === 0) return;

    const usersDir = join(process.cwd(), 'users');

    for (const wallet of wallets) {
      const username = (wallet.label ?? wallet.wallet)
        .replace(/^@/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const userDir = join(usersDir, username);

      try {
        const activity = await this.polymarketService.getActivity(
          wallet.wallet,
          20,
        );
        await mkdir(userDir, { recursive: true });
        const logPath = join(userDir, 'last_20_trades.log');
        const content = JSON.stringify(
          {
            username: wallet.label ?? `@${username}`,
            wallet: wallet.wallet,
            count: activity.length,
            activity,
          },
          null,
          2,
        );
        await writeFile(logPath, content, 'utf-8');
        this.logger.log(
          `Wrote latest ${activity.length} activities (Data API) to ${logPath}`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to log activity for ${username}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  async initializeCursor(
    wallet: FollowedWallet,
    tradeActivities: PolymarketActivityItem[],
  ) {
    const hasCursor =
      wallet.lastTradeId != null &&
      wallet.lastTradeId !== '' &&
      String(wallet.lastTradeId).toLowerCase() !== 'null';
    if (hasCursor) return;

    if (!tradeActivities?.length) return;

    const newestId = this.activityTradeId(tradeActivities[0]);
    if (!newestId || newestId === wallet.id) {
      this.logger.warn(`  Skipping cursor init: no valid trade id`);
      return;
    }

    await this.followedWallets.update(wallet.id, {
      lastTradeId: newestId,
    });
  }

  @Interval(1500)
  async pollFollowedUsers() {
    if (this.polling) return;
    this.polling = true;
    let cycleError: string | null = null;
    let leadersPolled = 0;
    try {
      const wallets = await this.followedWallets.findActive();
      leadersPolled = wallets.length;
      const copyEnabled = await this.botService.isCopyTradingEnabled();

      for (const wallet of wallets) {
        const walletId = wallet.id;
        const makerAddress = wallet.wallet;
        const label = wallet.label ?? wallet.wallet.slice(0, 10) + '…';

        let activity: PolymarketActivityItem[];
        try {
          activity = await this.polymarketService.getActivity(
            makerAddress,
            100,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`  [${label}] activity fetch failed: ${msg}`);
          cycleError = cycleError ?? msg;
          continue;
        }

        const fetchedAt = new Date();
        const tradesOnly = activity.filter(
          (a): a is PolymarketActivityItem =>
            a.type === 'TRADE' &&
            typeof a.asset === 'string' &&
            a.asset.length > 0,
        );

        const hasCursor =
          wallet.lastTradeId != null &&
          wallet.lastTradeId !== '' &&
          String(wallet.lastTradeId).toLowerCase() !== 'null';
        if (!hasCursor) {
          await this.initializeCursor(wallet, tradesOnly);
          this.logger.log(
            `  [${label}] cursor initialized (${tradesOnly.length} TRADE(s) seen)`,
          );
          continue;
        }

        const cursorId = wallet.lastTradeId;
        const newTrades: PolymarketActivityItem[] = [];

        for (const a of tradesOnly) {
          if (this.activityTradeId(a) === cursorId) break;
          newTrades.push(a);
        }

        // Always advance cursor; handleTrade respects kill switch
        for (const a of newTrades.reverse()) {
          await this.copyService.handleTrade(
            makerAddress,
            this.activityToRawTrade(a, fetchedAt),
          );
        }

        if (newTrades.length > 0) {
          const newCursorId = this.activityTradeId(newTrades[0]);
          await this.followedWallets.update(walletId, {
            lastTradeId: newCursorId,
          });
          this.logger.log(
            `  [${label}] ${newTrades.length} new TRADE(s) processed, cursor updated${copyEnabled ? '' : ' (copy paused)'}`,
          );
        }
      }

      this.botService.markPollResult({
        ok: !cycleError,
        error: cycleError,
        leadersPolled,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Poll cycle failed: ${msg}`);
      this.botService.markPollResult({
        ok: false,
        error: msg,
        leadersPolled,
      });
    } finally {
      this.polling = false;
    }
  }
}
