import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CopyTradingModule } from './copy-trading/copy-trading.module';
import { FollowedWalletsModule } from './followed-wallets/followed-wallets.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlertsModule } from './alerts/alerts.module';
import { PolymarketModule } from './polymarket/polymarket.module';
import { BotModule } from './bot/bot.module';
import { OperatorWalletsModule } from './operator-wallets/operator-wallets.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ChartsModule } from './charts/charts.module';
import { HealthController } from './health/health.controller';
import { ApiKeyGuard } from './auth/api-key.guard';
import { FollowedWallet } from './followed-wallets/entity/followed-wallet.entity';
import { LeaderTrade } from './copy-trading/entities/leader-trade.entity';
import { BotPosition } from './copy-trading/entities/bot-position.entity';
import { PerformanceAlert } from './alerts/entities/performance-alert.entity';
import { BotSettings } from './bot/entities/bot-settings.entity';
import { OperatorWallet } from './operator-wallets/entities/operator-wallet.entity';

const entities = [
  FollowedWallet,
  LeaderTrade,
  BotPosition,
  PerformanceAlert,
  BotSettings,
  OperatorWallet,
];

function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL')?.trim();
  const sync = config.get<string>('DB_SYNC', 'true') !== 'false';
  const logging = config.get<string>('DB_LOGGING', 'false') === 'true';

  // Free hosts (Neon, Supabase, Railway) give one connection string.
  // Tables are auto-created when DB_SYNC=true (default).
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: sync,
      logging,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '5432')),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_NAME', 'ctb'),
    entities,
    synchronize: sync,
    logging,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'env'],
    }),
    // ~120 req / min / IP default (override via env later if needed)
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 120),
      },
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    PolymarketModule,
    CopyTradingModule,
    FollowedWalletsModule,
    DashboardModule,
    AlertsModule,
    BotModule,
    OperatorWalletsModule,
    PortfolioModule,
    ChartsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
