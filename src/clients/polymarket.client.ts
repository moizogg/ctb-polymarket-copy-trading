import { Injectable, Logger, Inject, Optional, forwardRef } from '@nestjs/common';
import { Wallet, JsonRpcProvider } from 'ethers';
import { V5SignerAdapter } from '../utils/web3-utils';
import { BotService } from '../bot/bot.service';

@Injectable()
export class PolymarketClient {
  private readonly logger = new Logger(PolymarketClient.name);
  private clientPromise: Promise<any> | null = null;

  constructor(
    @Optional()
    @Inject(forwardRef(() => BotService))
    private readonly botService?: BotService,
  ) {}

  private async createClient() {
    const { ClobClient } = await import('@polymarket/clob-client');

    let funderAddress = process.env.FUNDER_ADDRESS?.trim() || null;
    let apiCredsRaw = process.env.POLYMARKET_API_CREDS?.trim() || null;

    if (this.botService) {
      const dynamic = await this.botService.getDynamicCreds();
      if (dynamic.funderAddress) funderAddress = dynamic.funderAddress;
      if (dynamic.apiCredsJson) apiCredsRaw = dynamic.apiCredsJson;
    }

    if (
      !funderAddress ||
      funderAddress.includes('your') ||
      funderAddress.includes('0x_') ||
      funderAddress.length !== 42
    ) {
      throw new Error('Execution wallet (FUNDER_ADDRESS) is not configured.');
    }

    if (!apiCredsRaw) {
      throw new Error('POLYMARKET_API_CREDS not configured.');
    }

    let apiCreds: any;
    try {
      apiCreds = typeof apiCredsRaw === 'string' ? JSON.parse(apiCredsRaw) : apiCredsRaw;
    } catch {
      throw new Error('Invalid JSON in POLYMARKET_API_CREDS.');
    }

    const rpcUrl = process.env.RPC_URL?.trim() || 'https://poly.api.pocket.network';
    const provider = new JsonRpcProvider(rpcUrl);

    let privateKey = process.env.PRIVATE_KEY?.trim();
    if (
      !privateKey ||
      privateKey.includes('your') ||
      privateKey.includes('0x_') ||
      privateKey.length < 64
    ) {
      // Use dummy wallet for API-key authenticated order posting
      privateKey = '0x0000000000000000000000000000000000000000000000000000000000000001';
    }

    const wallet = new Wallet(privateKey, provider);
    const signer = new V5SignerAdapter(wallet);

    return new ClobClient(
      'https://clob.polymarket.com',
      137,
      signer as any,
      apiCreds,
      2,
      funderAddress,
    );
  }

  async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = this.createClient().catch((err) => {
        this.clientPromise = null;
        this.logger.warn(err.message);
        throw err;
      });
    }
    return this.clientPromise;
  }

  resetClient() {
    this.clientPromise = null;
  }
}
