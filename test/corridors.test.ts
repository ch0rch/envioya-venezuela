import { describe, it, expect } from 'vitest';
import type { Dataset } from '../src/lib/saldoar.types';
import { availableCorridors } from '../src/lib/corridors';

const ds: Dataset = {
  rates: [
    { price: 748, system1: 'usdt', system2: 'pago_movil', currency1: 'USDT', currency2: 'VES' },
    { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
    { price: 739, system1: 'usdc', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
  ],
  systems: {},
  pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
};

describe('availableCorridors', () => {
  it('returns distinct origin currencies with labels, locale-sorted', () => {
    const c = availableCorridors(ds);
    expect(c.map((x) => x.currency)).toEqual(['USD', 'USDT']);
    expect(c.find((x) => x.currency === 'USD')?.label).toContain('Dólar');
  });

  it('exposes the origin systemId for each corridor', () => {
    const dsWithSystemId = {
      rates: [
        { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
        { price: 852, system1: 'banco_eur', system2: 'pago_movil', currency1: 'EUR', currency2: 'VES' },
      ],
      systems: {},
      pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
    };
    const c = availableCorridors(dsWithSystemId as Parameters<typeof availableCorridors>[0]);
    expect(c.find((x) => x.currency === 'USD')?.systemId).toBe('zinli');
    expect(c.find((x) => x.currency === 'EUR')?.systemId).toBe('banco_eur');
  });

  it('falls back to raw code and default flag for unknown currencies', () => {
    const dsUnknown: Dataset = {
      rates: [
        { price: 1, system1: 'x', system2: 'pago_movil', currency1: 'XYZ', currency2: 'VES' },
      ],
      systems: {},
      pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
    };
    const c = availableCorridors(dsUnknown);
    expect(c).toEqual([{ currency: 'XYZ', label: 'XYZ', flag: '💱', systemId: 'x' }]);
  });
});
