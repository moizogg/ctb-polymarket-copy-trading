import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { BotService } from '../bot/bot.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bot: BotService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'API root (links)' })
  root() {
    return {
      ok: true,
      service: 'ctb-backend',
      message:
        'CTB Copy Trading API is running. Operator dashboard is the frontend on another port.',
      docs: '/api',
      health: '/health',
      botStatus: '/bot/status',
      dashboardStats: '/dashboard/stats',
      wallets: '/wallets',
      portfolio: '/portfolio',
      charts: '/charts/markets/search',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness + DB readiness' })
  async check() {
    let dbOk = false;
    let dbError: string | null = null;
    try {
      await this.dataSource.query('SELECT 1');
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }

    const bot = await this.bot.getStatus();

    return {
      ok: dbOk,
      service: 'ctb-backend',
      timestamp: new Date().toISOString(),
      database: { ok: dbOk, error: dbError },
      bot: {
        copyTradingEnabled: bot.copyTradingEnabled,
        lastPollAt: bot.lastPollAt,
        lastPollOk: bot.lastPollOk,
      },
    };
  }
}
