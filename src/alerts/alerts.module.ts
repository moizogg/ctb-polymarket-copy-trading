import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PerformanceAlert } from './entities/performance-alert.entity';

@Module({
  imports: [
    DashboardModule,
    TypeOrmModule.forFeature([PerformanceAlert]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
