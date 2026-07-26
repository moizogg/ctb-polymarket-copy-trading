import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotSettings } from './entities/bot-settings.entity';

const SETTINGS_ID = 1;

export interface BotStatusDto {
  copyTradingEnabled: boolean;
  pauseReason: string | null;
  executionAddress: string | null;
  updatedAt: string | null;
  pollIntervalMs: number;
  /** Last time the leader poller finished a cycle */
  lastPollAt: string | null;
  lastPollOk: boolean;
  lastPollError: string | null;
  activeLeadersPolled: number;
  serverTime: string;
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);

  /** In-memory poll health (not persisted) */
  private lastPollAt: Date | null = null;
  private lastPollOk = true;
  private lastPollError: string | null = null;
  private activeLeadersPolled = 0;

  constructor(
    @InjectRepository(BotSettings)
    private readonly settingsRepo: Repository<BotSettings>,
  ) {}

  async onModuleInit() {
    await this.ensureSettings();
  }

  private async ensureSettings(): Promise<BotSettings> {
    let row = await this.settingsRepo.findOne({ where: { id: SETTINGS_ID } });
    if (!row) {
      row = this.settingsRepo.create({
        id: SETTINGS_ID,
        copyTradingEnabled: false,
        pauseReason: 'Default safety pause (Kill switch ON). Turn off pause to start live copy trading.',
      });
      row = await this.settingsRepo.save(row);
      this.logger.log('Initialized bot_settings (copyTradingEnabled=false, kill switch ON by default)');
    }
    return row;
  }

  async isCopyTradingEnabled(): Promise<boolean> {
    const row = await this.ensureSettings();
    return row.copyTradingEnabled;
  }

  markPollResult(opts: {
    ok: boolean;
    error?: string | null;
    leadersPolled?: number;
  }) {
    this.lastPollAt = new Date();
    this.lastPollOk = opts.ok;
    this.lastPollError = opts.ok ? null : (opts.error ?? 'poll failed');
    if (opts.leadersPolled != null) {
      this.activeLeadersPolled = opts.leadersPolled;
    }
  }

  async getStatus(): Promise<BotStatusDto> {
    const row = await this.ensureSettings();
    const address =
      row.executionAddress?.trim() ||
      process.env.FUNDER_ADDRESS?.trim() ||
      null;
    return {
      copyTradingEnabled: row.copyTradingEnabled,
      pauseReason: row.pauseReason ?? null,
      executionAddress: address,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 1500),
      lastPollAt: this.lastPollAt ? this.lastPollAt.toISOString() : null,
      lastPollOk: this.lastPollOk,
      lastPollError: this.lastPollError,
      activeLeadersPolled: this.activeLeadersPolled,
      serverTime: new Date().toISOString(),
    };
  }

  async saveConfig(dto: {
    funderAddress: string;
    apiCreds?: Record<string, unknown> | string;
  }): Promise<BotStatusDto> {
    const row = await this.ensureSettings();
    row.executionAddress = dto.funderAddress.trim().toLowerCase();
    if (dto.apiCreds) {
      row.apiCredsJson =
        typeof dto.apiCreds === 'string'
          ? dto.apiCreds
          : JSON.stringify(dto.apiCreds);
    }
    await this.settingsRepo.save(row);
    this.logger.log(`Saved dynamic execution config for ${row.executionAddress}`);
    return this.getStatus();
  }

  async getDynamicCreds(): Promise<{
    funderAddress: string | null;
    apiCredsJson: string | null;
  }> {
    const row = await this.ensureSettings();
    const funderAddress =
      row.executionAddress?.trim() ||
      process.env.FUNDER_ADDRESS?.trim() ||
      null;
    const apiCredsJson =
      row.apiCredsJson?.trim() ||
      process.env.POLYMARKET_API_CREDS?.trim() ||
      null;
    return { funderAddress, apiCredsJson };
  }

  async pause(reason?: string): Promise<BotStatusDto> {
    const row = await this.ensureSettings();
    row.copyTradingEnabled = false;
    row.pauseReason = reason?.trim() || 'Paused via API';
    await this.settingsRepo.save(row);
    this.logger.warn(`Copy trading PAUSED: ${row.pauseReason}`);
    return this.getStatus();
  }

  async resume(): Promise<BotStatusDto> {
    const row = await this.ensureSettings();
    row.copyTradingEnabled = true;
    row.pauseReason = null;
    await this.settingsRepo.save(row);
    this.logger.log('Copy trading RESUMED');
    return this.getStatus();
  }
}
