import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderTrade } from '../copy-trading/entities/leader-trade.entity';
import { ChartsService } from './charts.service';
import { ChartsController } from './charts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LeaderTrade])],
  controllers: [ChartsController],
  providers: [ChartsService],
  exports: [ChartsService],
})
export class ChartsModule {}
