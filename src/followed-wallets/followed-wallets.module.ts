import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowedWallet } from './entity/followed-wallet.entity';
import { FollowedWalletsService } from './followed-wallets.service';
import { FollowedWalletsController } from './followed-wallets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FollowedWallet])],
  providers: [FollowedWalletsService],
  controllers: [FollowedWalletsController],
  exports: [FollowedWalletsService],
})
export class FollowedWalletsModule {}
