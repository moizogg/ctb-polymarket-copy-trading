import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import {
  PerformanceAlert,
  AlertType,
  AlertSeverity,
} from './entities/performance-alert.entity';
import { DashboardService } from '../dashboard/dashboard.service';

const FAIL_RATE_THRESHOLD_PERCENT = 15;
const COPY_RATE_LOW_THRESHOLD_PERCENT = 40;
const NO_TRADES_HOURS = 24;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @Inject(forwardRef(() => DashboardService))
    private readonly dashboard: DashboardService,
    @InjectRepository(PerformanceAlert)
    private readonly repo: Repository<PerformanceAlert>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async evaluatePerformanceAlerts(): Promise<void> {
    try {
      const stats = await this.dashboard.getStatsForAlerts();
      const { total, copied, failed, lastTradeAt } = stats;

      if (total === 0) {
        await this.createAlertIfNotExists(
          AlertType.NO_RECENT_TRADES,
          AlertSeverity.INFO,
          {
            message:
              'No trades recorded yet. Add followed wallets to start copy trading.',
          },
        );
        return;
      }

      const failRatePercent = (failed / total) * 100;
      const copyRatePercent = (copied / total) * 100;

      if (failRatePercent >= FAIL_RATE_THRESHOLD_PERCENT) {
        await this.createAlertIfNotExists(
          AlertType.HIGH_FAIL_RATE,
          AlertSeverity.CRITICAL,
          {
            message: `Fail rate is ${failRatePercent.toFixed(1)}% (threshold: ${FAIL_RATE_THRESHOLD_PERCENT}%). Check execution and API.`,
            failRatePercent,
            failed,
            total,
          },
        );
      }

      if (
        copyRatePercent <= COPY_RATE_LOW_THRESHOLD_PERCENT &&
        total >= 10
      ) {
        await this.createAlertIfNotExists(
          AlertType.LOW_COPY_RATE,
          AlertSeverity.WARNING,
          {
            message: `Copy rate is ${copyRatePercent.toFixed(1)}% (below ${COPY_RATE_LOW_THRESHOLD_PERCENT}%). Many trades are being skipped.`,
            copyRatePercent,
            copied,
            total,
          },
        );
      }

      if (lastTradeAt) {
        const hoursSinceLastTrade =
          (Date.now() - lastTradeAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastTrade >= NO_TRADES_HOURS) {
          await this.createAlertIfNotExists(
            AlertType.NO_RECENT_TRADES,
            AlertSeverity.WARNING,
            {
              message: `No new trades in the last ${Math.floor(hoursSinceLastTrade)} hours. Leaders may be inactive.`,
              lastTradeAt: lastTradeAt.toISOString(),
            },
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        'Failed to evaluate performance alerts',
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async createAlertIfNotExists(
    type: AlertType,
    severity: AlertSeverity,
    payload: { message: string; [k: string]: unknown },
  ): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recent = await this.repo.findOne({
      where: {
        type,
        read: false,
        createdAt: MoreThan(twoHoursAgo),
      },
      order: { createdAt: 'DESC' },
    });
    if (recent) return;

    const alert = this.repo.create({
      type,
      severity,
      message: payload.message,
      metadata: payload,
      read: false,
    });
    await this.repo.save(alert);
    this.logger.log(`Alert created: ${type} - ${payload.message}`);
  }

  async findAll(unreadOnly = false): Promise<PerformanceAlert[]> {
    const where = unreadOnly ? { read: false } : {};
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(id: string): Promise<PerformanceAlert> {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.read = true;
    return this.repo.save(alert);
  }

  async markAllAsRead(): Promise<{ count: number }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(PerformanceAlert)
      .set({ read: true })
      .where('read = :r', { r: false })
      .execute();
    return { count: result.affected ?? 0 };
  }

  async createTradeFailureAlert(tradeId: string, reason: string): Promise<void> {
    try {
      const alert = this.repo.create({
        type: AlertType.HIGH_FAIL_RATE,
        severity: AlertSeverity.CRITICAL,
        message: `Copy trade ${tradeId} failed: ${reason}`,
        metadata: { tradeId, reason },
        read: false,
      });
      await this.repo.save(alert);
      this.logger.warn(`Alert created for failed trade ${tradeId}: ${reason}`);
    } catch (err) {
      this.logger.warn('Failed to save trade failure alert', err);
    }
  }
}
