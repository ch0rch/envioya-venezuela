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
  it('returns distinct origin currencies with labels', () => {
    const c = availableCorridors(ds);
    const currencies = c.map((x) => x.currency).sort();
    expect(currencies).toEqual(['USD', 'USDT']);
    expect(c.find((x) => x.currency === 'USD')?.label).toContain('Dólar');
  });
});
