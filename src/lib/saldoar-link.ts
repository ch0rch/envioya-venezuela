// Route format: /{locale}/a/{from}/{to}/{from_amount}/{to_amount}
// Empirically verified 2026-06-27: slot 1 = from-amount (send), slot 2 = to-amount (receive).
// Evidence: SSR HTML for /es-VE/a/zinli/pago_movil/100/0 contains reciprocal hrefs
//   /es-VE/a/palpal/pago_movil/100/0   (palpal sends 100)
//   /es-VE/a/pago_movil/palpal/0/100   (pago_movil sends 0, palpal receives 100)

const LOCALE = 'es-VE';
const BASE = 'https://saldo.com.ar';
const DEST = 'pago_movil';

export const COBRAR_FALLBACK_BASE = `${BASE}/${LOCALE}/cobrar`;

/**
 * Builds a saldo.com.ar deep-link that pre-selects {systemId} → pago_movil
 * and pre-fills the send amount. Amount is rounded to the nearest integer.
 */
export function buildSaldoarLink(systemId: string, amount: number): string {
  const amt = Math.max(0, Math.round(amount));
  return `${BASE}/${LOCALE}/a/${systemId}/${DEST}/${amt}/0`;
}

/**
 * Builds a /cobrar/ fallback link without an amount, for use when amount
 * semantics are unconfirmed for a given system pair.
 */
export function buildCobrarLink(systemId: string): string {
  return `${COBRAR_FALLBACK_BASE}/${systemId}-a-${DEST}`;
}
