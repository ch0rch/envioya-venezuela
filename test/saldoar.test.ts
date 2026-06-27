import { describe, it, expect, vi, beforeEach } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';
import currencies from './fixtures/currencies.json';
import { getDataset, __resetCache } from '../src/lib/saldoar';

function mockFetchOnce() {
  const body = (url: string) => {
    if (url.includes('best_rates')) return bestRates;
    if (url.includes('system_information')) return pmInfo;
    if (url.includes('systems')) return systems;
    return currencies;
  };
  return vi.fn(async (url: string) => ({
    ok: true,
    json: async () => body(url),
  })) as unknown as typeof fetch;
}

beforeEach(() => __resetCache());

describe('getDataset', () => {
  it('fetches and builds a dataset', async () => {
    vi.stubGlobal('fetch', mockFetchOnce());
    const { dataset } = await getDataset(1000);
    expect(dataset.rates.length).toBeGreaterThan(0);
  });

  it('serves cache within TTL without refetching', async () => {
    const f = mockFetchOnce();
    vi.stubGlobal('fetch', f);
    await getDataset(1000);
    const calls = (f as any).mock.calls.length;
    await getDataset(1000 + 60_000); // 1 min later, within 10 min TTL
    expect((f as any).mock.calls.length).toBe(calls);
  });

  it('serves stale cache when a later fetch fails', async () => {
    vi.stubGlobal('fetch', mockFetchOnce());
    await getDataset(1000);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const { dataset } = await getDataset(1000 + 11 * 60_000); // past TTL, fetch fails
    expect(dataset.rates.length).toBeGreaterThan(0);
  });
});
