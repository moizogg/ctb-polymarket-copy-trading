import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { BotPosition } from '../copy-trading/entities/bot-position.entity';
import { PolymarketClient } from '../clients/polymarket.client';

const DATA_API = 'https://data-api.polymarket.com';

/** Polymarket Data API position row (subset we use). */
export interface LivePosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  outcome: string;
  eventSlug?: string;
  endDate?: string;
  redeemable?: boolean;
  negativeRisk?: boolean;
}

export interface PortfolioPositionRow {
  tokenId: string;
  marketId: string;
  title: string;
  slug: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  /** Size tracked by copy engine DB (if any) */
  localNetSize: number | null;
}

export interface PortfolioResponse {
  source: 'bot' | 'wallet';
  address: string | null;
  asOf: string;
  summary: {
    positionCount: number;
    totalCurrentValue: number;
    totalCashPnl: number;
    totalRealizedPnl: number;
    localTrackedCount: number;
  };
  positions: PortfolioPositionRow[];
  localPositions: {
    marketId: string;
    tokenId: string;
    netSize: string;
    updatedAt: string;
  }[];
  collateral: {
    available: boolean;
    balance: string | null;
    allowance: string | null;
    note: string;
  };
  warnings: string[];
}

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectRepository(BotPosition)
    private readonly positionsRepo: Repository<BotPosition>,
    private readonly polyClient: PolymarketClient,
  ) {}

  async getPortfolio(params: {
    source?: string;
    address?: string;
  }): Promise<PortfolioResponse> {
    const source = (params.source || 'bot').toLowerCase() === 'wallet'
      ? 'wallet'
      : 'bot';

    const warnings: string[] = [];
    let address: string | null = null;

    if (source === 'bot') {
      address =
        process.env.FUNDER_ADDRESS?.trim()?.toLowerCase() ||
        params.address?.trim()?.toLowerCase() ||
        null;
      if (!address) {
        warnings.push(
          'FUNDER_ADDRESS not set — showing local tracked positions only. Set FUNDER_ADDRESS for live Polymarket holdings.',
        );
      }
    } else {
      address = params.address?.trim()?.toLowerCase() || null;
      if (!address || !address.startsWith('0x')) {
        throw new BadRequestException(
          'address query param required for source=wallet (0x…)',
        );
      }
    }

    const localRows = await this.positionsRepo.find({
      order: { updatedAt: 'DESC' },
    });

    let live: LivePosition[] = [];
    if (address) {
      try {
        live = await this.fetchLivePositions(address);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Live positions fetch failed: ${msg}`);
        warnings.push(`Live positions unavailable: ${msg}`);
      }
    }

    const localByToken = new Map(
      localRows.map((p) => [p.tokenId, Number(p.netSize)]),
    );

    const positions: PortfolioPositionRow[] = live.map((p) => ({
      tokenId: p.asset,
      marketId: p.conditionId,
      title: p.title || p.slug || 'Unknown market',
      slug: p.slug || '',
      outcome: p.outcome || '',
      size: Number(p.size) || 0,
      avgPrice: Number(p.avgPrice) || 0,
      curPrice: Number(p.curPrice) || 0,
      currentValue: Number(p.currentValue) || 0,
      cashPnl: Number(p.cashPnl) || 0,
      percentPnl: Number(p.percentPnl) || 0,
      realizedPnl: Number(p.realizedPnl) || 0,
      localNetSize: localByToken.has(p.asset)
        ? (localByToken.get(p.asset) ?? null)
        : null,
    }));

    // Include local-only rows not present in live feed (for bot source)
    if (source === 'bot') {
      for (const loc of localRows) {
        if (!positions.some((p) => p.tokenId === loc.tokenId)) {
          positions.push({
            tokenId: loc.tokenId,
            marketId: loc.marketId,
            title: '(tracked by bot only — not in live API)',
            slug: '',
            outcome: '',
            size: Number(loc.netSize) || 0,
            avgPrice: 0,
            curPrice: 0,
            currentValue: 0,
            cashPnl: 0,
            percentPnl: 0,
            realizedPnl: 0,
            localNetSize: Number(loc.netSize) || 0,
          });
        }
      }
    }

    // Sort by absolute value / size
    positions.sort(
      (a, b) =>
        Math.abs(b.currentValue) - Math.abs(a.currentValue) ||
        Math.abs(b.size) - Math.abs(a.size),
    );

    const totalCurrentValue = positions.reduce(
      (s, p) => s + (p.currentValue || 0),
      0,
    );
    const totalCashPnl = positions.reduce((s, p) => s + (p.cashPnl || 0), 0);
    const totalRealizedPnl = positions.reduce(
      (s, p) => s + (p.realizedPnl || 0),
      0,
    );

    const collateral = await this.tryCollateralBalance(source);

    return {
      source,
      address,
      asOf: new Date().toISOString(),
      summary: {
        positionCount: positions.filter((p) => Math.abs(p.size) > 1e-9).length,
        totalCurrentValue: round4(totalCurrentValue),
        totalCashPnl: round4(totalCashPnl),
        totalRealizedPnl: round4(totalRealizedPnl),
        localTrackedCount: localRows.length,
      },
      positions,
      localPositions: localRows.map((p) => ({
        marketId: p.marketId,
        tokenId: p.tokenId,
        netSize: p.netSize,
        updatedAt:
          p.updatedAt instanceof Date
            ? p.updatedAt.toISOString()
            : String(p.updatedAt),
      })),
      collateral,
      warnings,
    };
  }

  /**
   * Sync local bot_positions netSize from live Data API for FUNDER_ADDRESS.
   */
  async reconcileFromLive(): Promise<{
    updated: number;
    created: number;
    address: string | null;
    warnings: string[];
  }> {
    const address = process.env.FUNDER_ADDRESS?.trim()?.toLowerCase() || null;
    const warnings: string[] = [];
    if (!address) {
      throw new BadRequestException(
        'FUNDER_ADDRESS required to reconcile bot positions',
      );
    }

    const live = await this.fetchLivePositions(address);
    let updated = 0;
    let created = 0;

    for (const p of live) {
      if (!p.asset || !p.conditionId) continue;
      let row = await this.positionsRepo.findOne({
        where: { marketId: p.conditionId, tokenId: p.asset },
      });
      const sizeStr = String(p.size ?? 0);
      if (!row) {
        row = this.positionsRepo.create({
          marketId: p.conditionId,
          tokenId: p.asset,
          netSize: sizeStr,
        });
        created++;
      } else {
        row.netSize = sizeStr;
        updated++;
      }
      await this.positionsRepo.save(row);
    }

    this.logger.log(
      `Reconcile complete for ${address}: created=${created} updated=${updated}`,
    );
    return { updated, created, address, warnings };
  }

  private async fetchLivePositions(user: string): Promise<LivePosition[]> {
    const { data } = await axios.get<LivePosition[]>(`${DATA_API}/positions`, {
      params: { user },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CTB/1.0)' },
      timeout: 15_000,
    });
    return Array.isArray(data) ? data : [];
  }

  private async tryCollateralBalance(source: 'bot' | 'wallet'): Promise<{
    available: boolean;
    balance: string | null;
    allowance: string | null;
    note: string;
  }> {
    if (source !== 'bot') {
      return {
        available: false,
        balance: null,
        allowance: null,
        note: 'USDC collateral via CLOB only available for bot (server credentials).',
      };
    }

    try {
      const client = await this.polyClient.getClient();
      const res = await client.getBalanceAllowance({
        asset_type: 'COLLATERAL',
      });
      return {
        available: true,
        balance: res?.balance != null ? String(res.balance) : null,
        allowance: res?.allowance != null ? String(res.allowance) : null,
        note: 'From Polymarket CLOB (bot credentials).',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        balance: null,
        allowance: null,
        note: `CLOB collateral unavailable (set PRIVATE_KEY + POLYMARKET_API_CREDS): ${msg}`,
      };
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
