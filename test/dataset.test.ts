import { describe, it, expect } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';
import { buildDataset } from '../src/lib/dataset';

describe('buildDataset', () => {
  const ds = buildDataset({ bestRates, systems, pagoMovilInfo: pmInfo });

  it('keeps only pago_movil/VES rates', () => {
    expect(ds.rates.length).toBeGreaterThan(0);
    expect(ds.rates.every((r) => r.system2 === 'pago_movil' && r.currency2 === 'VES')).toBe(true);
  });

  it('indexes systems by id', () => {
    expect(ds.systems['usdt']).toBeDefined();
    expect(ds.systems['usdt'].currency).toBe('USDT');
  });

  it('extracts pago movil time_average', () => {
    expect(ds.pagoMovilInfo.timeAverage).toBeGreaterThan(0);
  });
});
