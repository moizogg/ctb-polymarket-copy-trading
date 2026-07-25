import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotPosition } from '../copy-trading/entities/bot-position.entity';
import { PolymarketClient } from '../clients/polymarket.client';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BotPosition])],
  controllers: [PortfolioController],
  providers: [PortfolioService, PolymarketClient],
  exports: [PortfolioService],
})
export class PortfolioModule {}
