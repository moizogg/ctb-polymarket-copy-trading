import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DATA_API_ACTIVITY = 'https://data-api.polymarket.com/activity';

/** One activity item from Polymarket Data API (matches "most recent activities" format) */
export interface PolymarketActivityItem {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string;
  size: number;
  usdcSize: number;
  transactionHash: string;
  price: number;
  asset: string;
  side: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  name: string;
  pseudonym: string;
  bio: string;
  profileImage: string;
  profileImageOptimized: string;
  [key: string]: unknown;
}

@Injectable()
export class PolymarketService {
  async getProxyWallet(usernameRaw: string): Promise<string | null> {
    const username = (usernameRaw || '').trim().replace(/^@/, '');
    if (!username) return null;

    // Direct EVM wallet address passed instead of username
    if (/^0x[a-fA-F0-9]{40}$/.test(username)) {
      return username.toLowerCase();
    }

    // Attempt 1: Polymarket Gamma API profile lookup
    try {
      const { data } = await axios.get('https://gamma-api.polymarket.com/profiles', {
        params: { username },
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CTB/1.0)' },
        timeout: 10_000,
      });
      if (Array.isArray(data) && data[0]?.proxyWallet) {
        return data[0].proxyWallet.toLowerCase();
      }
      if (data?.proxyWallet) {
        return data.proxyWallet.toLowerCase();
      }
    } catch {
      /* fallback to page scraping */
    }

    // Attempt 2: HTML Scraping with regex fallback & __NEXT_DATA__
    try {
      const url = `https://polymarket.com/@${username}`;
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10_000,
      });

      // Regex matching for embedded JSON fields
      const regexMatch =
        html.match(/"proxyWallet"\s*:\s*"(0x[a-fA-F0-9]{40})"/i) ||
        html.match(/"address"\s*:\s*"(0x[a-fA-F0-9]{40})"/i);
      if (regexMatch?.[1]) {
        return regexMatch[1].toLowerCase();
      }

      // __NEXT_DATA__ Cheerio parsing
      const $ = cheerio.load(html);
      const nextDataRaw = $('#__NEXT_DATA__').html();
      if (nextDataRaw) {
        const nextData = JSON.parse(nextDataRaw);
        const queries = nextData?.props?.pageProps?.dehydratedState?.queries;
        if (Array.isArray(queries)) {
          for (const q of queries) {
            const proxyWallet = q?.state?.data?.proxyWallet;
            if (proxyWallet && typeof proxyWallet === 'string') {
              return proxyWallet.toLowerCase();
            }
          }
        }
      }
    } catch {
      /* return null if not resolvable */
    }

    return null;
  }

  /**
   * Fetch user activity from Polymarket Data API (same as "most recent activities").
   * Use this for activity feed; CLOB getTrades is a different dataset (order-book matches only).
   */
  async getActivity(proxyWallet: string, limit = 20): Promise<PolymarketActivityItem[]> {
    const { data } = await axios.get<PolymarketActivityItem[]>(DATA_API_ACTIVITY, {
      params: { user: proxyWallet, limit },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CTB/1.0)' },
    });
    return Array.isArray(data) ? data : [];
  }
}
