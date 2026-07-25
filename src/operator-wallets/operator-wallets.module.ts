import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorWallet } from './entities/operator-wallet.entity';
import { OperatorWalletsService } from './operator-wallets.service';
import { OperatorWalletsController } from './operator-wallets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OperatorWallet])],
  controllers: [OperatorWalletsController],
  providers: [OperatorWalletsService],
  exports: [OperatorWalletsService],
})
export class OperatorWalletsModule {}
