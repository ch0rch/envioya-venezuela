import { describe, it, expect } from 'vitest';
import type { Dataset } from '../src/lib/saldoar.types';
import { getRoutes } from '../src/lib/routes';

const ds: Dataset = {
  rates: [
    { price: 748, system1: 'usdt', system2: 'pago_movil', currency1: 'USDT', currency2: 'VES' },
    { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
    { price: 852, system1: 'banco_eur', system2: 'pago_movil', currency1: 'EUR', currency2: 'VES' },
  ],
  systems: {
    usdt: { id: 'usdt', name: 'USDT', currency: 'USDT', fixedFeeSend: 0, percentFeeSend: 0, minSend: 15, maxSend: 100000 },
    zinli: { id: 'zinli', name: 'Zinli', currency: 'USD', fixedFeeSend: 0, percentFeeSend: 0, minSend: 15, maxSend: 100000 },
    banco_eur: { id: 'banco_eur', name: 'Banco (EUR)', currency: 'EUR', fixedFeeSend: 0, percentFeeSend: 0, minSend: 13, maxSend: 100000 },
  },
  pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
};

describe('getRoutes', () => {
  it('returns only routes matching the origin currency', () => {
    const routes = getRoutes(ds, 'USD', 100);
    expect(routes).toHaveLength(1);
    expect(routes[0].systemId).toBe('zinli');
    expect(routes[0].currency).toBe('USD');
  });

  it('computes gross arrival in VES', () => {
    const routes = getRoutes(ds, 'USDT', 100);
    expect(routes[0].arrivalVes).toBe(74800);
  });

  it('exposes the pago movil time as informational time', () => {
    const routes = getRoutes(ds, 'USDT', 100);
    expect(routes[0].timeAverageMin).toBe(17);
  });

  it('returns empty array for an origin with no route', () => {
    expect(getRoutes(ds, 'JPY', 100)).toEqual([]);
  });

  it('flags amounts below the system minimum', () => {
    const routes = getRoutes(ds, 'USDT', 5);
    expect(routes[0].belowMin).toBe(true);
  });

  it('does not flag amounts at or above the system minimum', () => {
    const routes = getRoutes(ds, 'USDT', 100);
    expect(routes[0].belowMin).toBe(false);
  });

  it('ranks by arrival amount descending', () => {
    const ds2: Dataset = {
      ...ds,
      rates: [
        { price: 700, system1: 'a', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
        { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
      ],
      systems: {
        ...ds.systems,
        a: { id: 'a', name: 'A', currency: 'USD', fixedFeeSend: 0, percentFeeSend: 0, minSend: 1, maxSend: 1e9 },
      },
    };
    const routes = getRoutes(ds2, 'USD', 100);
    expect(routes.map((r) => r.systemId)).toEqual(['zinli', 'a']);
  });
});
