import { Module, forwardRef } from '@nestjs/common';
import { CopyTradingModule } from '../copy-trading/copy-trading.module';
import { FollowedWalletsModule } from '../followed-wallets/followed-wallets.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [forwardRef(() => CopyTradingModule), FollowedWalletsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
