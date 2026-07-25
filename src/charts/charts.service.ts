import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import {
  LeaderTrade,
  TradeStatus,
} from '../copy-trading/entities/leader-trade.entity';

const CLOB = 'https://clob.polymarket.com';
const GAMMA = 'https://gamma-api.polymarket.com';

export type ChartInterval = '1h' | '6h' | '1d' | '1w' | '1m' | 'max';

@Injectable()
export class ChartsService {
  private readonly logger = new Logger(ChartsService.name);

  constructor(
    @InjectRepository(LeaderTrade)
    private readonly tradesRepo: Repository<LeaderTrade>,
  ) {}

  async searchMarkets(q: string, limit = 15) {
    const query = (q || '').trim();
    if (!query) {
      // Default: active high-volume markets
      const { data } = await axios.get(`${GAMMA}/markets`, {
        params: {
          limit: Math.min(limit, 30),
          active: true,
          closed: false,
          order: 'volume24hr',
          ascending: false,
        },
        timeout: 12_000,
        headers: { 'User-Agent': 'CTB/1.0' },
      });
      return this.normalizeMarkets(Array.isArray(data) ? data : [], limit);
    }

    try {
      const { data } = await axios.get(`${GAMMA}/public-search`, {
        params: { q: query, limit_per_type: limit },
        timeout: 12_000,
        headers: { 'User-Agent': 'CTB/1.0' },
      });
      const events = data?.events ?? [];
      const markets: any[] = [];
      for (const ev of events) {
        for (const m of ev.markets ?? []) {
          markets.push({
            ...m,
            eventTitle: ev.title,
            eventSlug: ev.slug,
          });
        }
      }
      if (markets.length) {
        return this.normalizeMarkets(markets, limit);
      }
    } catch (err) {
      this.logger.warn(
        `public-search failed: ${err instanceof Error ? err.message : err}`,
      );
    }

    // Fallback: gamma markets with slug_contains style via search param if any
    const { data } = await axios.get(`${GAMMA}/markets`, {
      params: {
        limit: Math.min(limit, 30),
        active: true,
        closed: false,
      },
      timeout: 12_000,
      headers: { 'User-Agent': 'CTB/1.0' },
    });
    const filtered = (Array.isArray(data) ? data : []).filter((m: any) => {
      const hay = `${m.question || ''} ${m.slug || ''}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
    return this.normalizeMarkets(filtered, limit);
  }

  async getPriceHistory(
    tokenId: string,
    interval: string = '1w',
    fidelity?: number,
  ) {
    const tid = (tokenId || '').trim();
    if (!tid) {
      throw new BadRequestException('tokenId is required');
    }

    const allowed: ChartInterval[] = ['1h', '6h', '1d', '1w', '1m', 'max'];
    const iv = (allowed.includes(interval as ChartInterval)
      ? interval
      : '1w') as ChartInterval;

    const fid =
      fidelity ??
      (iv === '1h' || iv === '6h' ? 5 : iv === '1d' ? 15 : iv === '1w' ? 60 : 240);

    try {
      const { data } = await axios.get(`${CLOB}/prices-history`, {
        params: {
          market: tid,
          interval: iv,
          fidelity: fid,
        },
        timeout: 15_000,
        headers: { 'User-Agent': 'CTB/1.0' },
      });

      const history = Array.isArray(data?.history) ? data.history : [];
      return {
        tokenId: tid,
        interval: iv,
        fidelity: fid,
        points: history.map((h: { t: number; p: number }) => ({
          time: Number(h.t),
          // lightweight-charts wants seconds; API already unix seconds
          value: Number(h.p),
        })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`prices-history failed: ${msg}`);
      throw new BadRequestException(`Price history unavailable: ${msg}`);
    }
  }

  /**
   * Bot performance series from COPIED trades in DB.
   * - copies: cumulative successful copies
   * - notional: cumulative |size * price| of copies (activity)
   * - signedNotional: BUY subtracts, SELL adds (rough cash proxy, not true PnL)
   */
  async getBotEquity() {
    const trades = await this.tradesRepo.find({
      where: { status: TradeStatus.COPIED },
      order: { createdAt: 'ASC' },
    });

    let copies = 0;
    let notional = 0;
    let signed = 0;
    const points: {
      time: number;
      copies: number;
      notional: number;
      signedNotional: number;
      tradeId: string;
      side: string;
      slug?: string | null;
    }[] = [];

    for (const t of trades) {
      const when =
        t.copiedAt ??
        (t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt));
      const size = Number(t.executedSize ?? t.size) || 0;
      const price = Number(t.price) || 0;
      const n = Math.abs(size * price);
      copies += 1;
      notional += n;
      signed += t.side === 'BUY' ? -n : n;

      points.push({
        time: Math.floor(when.getTime() / 1000),
        copies,
        notional: round4(notional),
        signedNotional: round4(signed),
        tradeId: t.tradeId,
        side: t.side,
        slug: t.slug,
      });
    }

    // Deduplicate same-second timestamps for lightweight-charts (keep last)
    const byTime = new Map<number, (typeof points)[0]>();
    for (const p of points) {
      byTime.set(p.time, p);
    }
    const series = Array.from(byTime.values()).sort((a, b) => a.time - b.time);

    return {
      totalCopied: copies,
      points: series,
      note:
        'signedNotional is a rough cash-flow proxy (BUY -, SELL +), not mark-to-market PnL.',
    };
  }

  /** Recent unique markets from bot trade log (for quick chart picks). */
  async getRecentTradeMarkets(limit = 12) {
    const trades = await this.tradesRepo.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
    const seen = new Set<string>();
    const out: {
      tokenId: string;
      marketId: string;
      slug?: string | null;
      side: string;
      lastAt: string;
    }[] = [];

    for (const t of trades) {
      if (!t.tokenId || seen.has(t.tokenId)) continue;
      seen.add(t.tokenId);
      out.push({
        tokenId: t.tokenId,
        marketId: t.marketId,
        slug: t.slug,
        side: t.side,
        lastAt: (
          t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        ).toISOString(),
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  private normalizeMarkets(raw: any[], limit: number) {
    return raw.slice(0, limit).map((m) => {
      let tokenIds: string[] = [];
      try {
        tokenIds =
          typeof m.clobTokenIds === 'string'
            ? JSON.parse(m.clobTokenIds)
            : Array.isArray(m.clobTokenIds)
              ? m.clobTokenIds
              : [];
      } catch {
        tokenIds = [];
      }
      let outcomes: string[] = [];
      try {
        outcomes =
          typeof m.outcomes === 'string'
            ? JSON.parse(m.outcomes)
            : Array.isArray(m.outcomes)
              ? m.outcomes
              : [];
      } catch {
        outcomes = [];
      }
      let prices: string[] = [];
      try {
        prices =
          typeof m.outcomePrices === 'string'
            ? JSON.parse(m.outcomePrices)
            : Array.isArray(m.outcomePrices)
              ? m.outcomePrices
              : [];
      } catch {
        prices = [];
      }

      return {
        id: m.id,
        question: m.question || m.title || m.groupItemTitle || 'Market',
        slug: m.slug,
        conditionId: m.conditionId,
        eventSlug: m.eventSlug,
        eventTitle: m.eventTitle,
        volume24hr: m.volume24hr ?? m.volumeNum,
        active: m.active,
        closed: m.closed,
        outcomes: outcomes.map((o, i) => ({
          name: o,
          tokenId: tokenIds[i] || '',
          price: prices[i] != null ? Number(prices[i]) : null,
        })),
        yesTokenId: tokenIds[0] || null,
        noTokenId: tokenIds[1] || null,
      };
    });
  }
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
