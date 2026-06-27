import { buildDataset } from './dataset';
import type { Dataset } from './saldoar.types';

const BASE = 'https://api.saldo.com.ar/v3';
const UA = 'Mozilla/5.0 (envioya-venezuela)';
const TTL_MS = 10 * 60_000;

export interface CachedDataset {
  dataset: Dataset;
  fetchedAt: number;
}

let cache: CachedDataset | null = null;

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`saldoar ${res.status}`);
  return res.json();
}

export async function getDataset(now: number = Date.now()): Promise<CachedDataset> {
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;
  try {
    const [bestRates, systems, pagoMovilInfo, _currencies] = await Promise.all([
      get(`${BASE}/best_rates?page%5Bsize%5D=500`),
      get(`${BASE}/systems?page%5Bsize%5D=100`),
      get(`${BASE}/systems/pago_movil/system_information`),
      get(`${BASE}/currencies?page%5Bsize%5D=50`),
    ]);
    cache = { dataset: buildDataset({ bestRates, systems, pagoMovilInfo }), fetchedAt: now };
    return cache;
  } catch (err) {
    if (cache) return cache; // stale-on-error
    throw err;
  }
}

export function __resetCache(): void {
  cache = null;
}
