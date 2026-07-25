/**
 * Standalone CLOB client factory for scripts/utilities.
 * Secrets come only from environment variables — never hard-code credentials.
 */
import 'dotenv/config';
import { Wallet, JsonRpcProvider } from 'ethers';
import { V5SignerAdapter } from 'src/utils/web3-utils';

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

export async function createClobClient() {
  const { ClobClient } = await import('@polymarket/clob-client');

  const privateKey = process.env.PRIVATE_KEY?.trim();
  const rpcUrl = process.env.RPC_URL?.trim();
  const funder = process.env.FUNDER_ADDRESS?.trim();
  const credsRaw = process.env.POLYMARKET_API_CREDS?.trim();

  if (!privateKey || privateKey.startsWith('0xyour') || privateKey.includes('...')) {
    throw new Error('Invalid or missing PRIVATE_KEY');
  }
  if (!rpcUrl) throw new Error('Missing RPC_URL');
  if (!credsRaw) throw new Error('Missing POLYMARKET_API_CREDS (JSON string)');
  if (!funder) throw new Error('Missing FUNDER_ADDRESS');

  let apiCreds: { key: string; secret: string; passphrase: string };
  try {
    apiCreds = JSON.parse(credsRaw);
  } catch {
    throw new Error('POLYMARKET_API_CREDS must be valid JSON');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const signer = new V5SignerAdapter(wallet);

  return new ClobClient(
    HOST,
    CHAIN_ID,
    signer as any,
    apiCreds,
    2,
    funder,
  );
}
