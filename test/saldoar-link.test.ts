import { describe, it, expect } from 'vitest';
import { buildSaldoarLink, buildCobrarLink, COBRAR_FALLBACK_BASE } from '../src/lib/saldoar-link';

// Step-1 empirical verification (2026-06-27):
// Curled https://saldo.com.ar/es-VE/a/zinli/pago_movil/100/0 — SSR HTML contains:
//   href="/es-VE/a/palpal/pago_movil/100/0"   (palpal sends 100 → pago_movil receives)
//   href="/es-VE/a/pago_movil/palpal/0/100"   (pago_movil sends 0 ← palpal receives 100)
// Conclusion: slot 1 = from-amount (send), slot 2 = to-amount (receive).
// Candidate A confirmed: /a/{systemId}/pago_movil/{amount}/0

describe('buildSaldoarLink', () => {
  it('builds an /a/ link carrying the send-amount to pago_movil', () => {
    expect(buildSaldoarLink('zinli', 100)).toBe(
      'https://saldo.com.ar/es-VE/a/zinli/pago_movil/100/0',
    );
  });

  it('rounds and serializes the amount without locale separators', () => {
    expect(buildSaldoarLink('usdt', 1500)).toBe(
      'https://saldo.com.ar/es-VE/a/usdt/pago_movil/1500/0',
    );
  });

  it('rounds fractional amounts to nearest integer', () => {
    expect(buildSaldoarLink('zinli', 99.7)).toBe(
      'https://saldo.com.ar/es-VE/a/zinli/pago_movil/100/0',
    );
  });

  it('clamps negative amounts to zero', () => {
    expect(buildSaldoarLink('zinli', -5)).toBe(
      'https://saldo.com.ar/es-VE/a/zinli/pago_movil/0/0',
    );
  });
});

describe('buildCobrarLink', () => {
  it('builds a /cobrar/ fallback link without amount', () => {
    expect(buildCobrarLink('zinli')).toBe(
      'https://saldo.com.ar/es-VE/cobrar/zinli-a-pago_movil',
    );
  });
});

describe('COBRAR_FALLBACK_BASE', () => {
  it('exposes the cobrar fallback base URL', () => {
    expect(COBRAR_FALLBACK_BASE).toBe('https://saldo.com.ar/es-VE/cobrar');
  });
});
