import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyTradingService } from './copy-trading.service';
import { PolymarketModule } from 'src/polymarket/polymarket.module';
import { CopyTradingStrategy } from './copy-trading.strategy';
import { PolymarketClient } from 'src/clients/polymarket.client';
import { LeaderTrade } from './entities/leader-trade.entity';
import { BotPosition } from './entities/bot-position.entity';
import { BotModule } from 'src/bot/bot.module';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [
    forwardRef(() => PolymarketModule),
    TypeOrmModule.forFeature([LeaderTrade, BotPosition]),
    BotModule,
    forwardRef(() => AlertsModule),
  ],
  providers: [CopyTradingService, CopyTradingStrategy, PolymarketClient],
  exports: [CopyTradingService],
})
export class CopyTradingModule {}
