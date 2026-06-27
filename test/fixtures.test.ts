import { describe, it, expect } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';

describe('fixtures', () => {
  it('best_rates has at least one USD -> VES via pago_movil route', () => {
    const rows = (bestRates as any).data as any[];
    const hit = rows.find(
      (r) =>
        r.attributes.currency1 === 'USD' &&
        r.attributes.currency2 === 'VES' &&
        r.attributes.system2 === 'pago_movil',
    );
    expect(hit).toBeDefined();
    expect(typeof hit.attributes.price).toBe('number');
  });

  it('systems includes pago_movil with receiver requirements', () => {
    const rows = (systems as any).data as any[];
    const pm = rows.find((r) => r.id === 'pago_movil');
    expect(pm).toBeDefined();
    expect(pm.attributes.bank_required).toBe(false);
    expect(pm.attributes.identification_number_required).toBe(true);
  });

  it('pago_movil system_information has a numeric time_average', () => {
    const attrs = (pmInfo as any).data?.attributes ?? (pmInfo as any).data?.[0]?.attributes;
    expect(typeof attrs.time_average).toBe('number');
  });
});
