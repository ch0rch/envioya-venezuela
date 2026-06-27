import type { Dataset } from './saldoar.types';

export interface Corridor {
  currency: string;
  label: string;
  flag: string;
  systemId: string;
}

export const CORRIDOR_LABELS: Record<string, { label: string; flag: string }> = {
  USD: { label: 'Dólar (USD)', flag: '🇺🇸' },
  USDT: { label: 'USDT', flag: '🪙' },
  USDC: { label: 'USDC', flag: '🪙' },
  EUR: { label: 'Euro (EUR) — España', flag: '🇪🇸' },
  COP: { label: 'Peso colombiano (COP)', flag: '🇨🇴' },
  CLP: { label: 'Peso chileno (CLP)', flag: '🇨🇱' },
  PEN: { label: 'Sol peruano (PEN)', flag: '🇵🇪' },
  BRL: { label: 'Real brasileño (BRL)', flag: '🇧🇷' },
  BOB: { label: 'Boliviano (BOB)', flag: '🇧🇴' },
  MXN: { label: 'Peso mexicano (MXN)', flag: '🇲🇽' },
  ARS: { label: 'Peso argentino (ARS)', flag: '🇦🇷' },
  BTC: { label: 'Bitcoin (BTC)', flag: '🪙' },
  DAI: { label: 'DAI', flag: '🪙' },
};

export function availableCorridors(ds: Dataset): Corridor[] {
  const byCurrency = new Map<string, string>(); // currency1 -> system1
  for (const r of ds.rates) {
    if (!byCurrency.has(r.currency1)) byCurrency.set(r.currency1, r.system1);
  }
  return [...byCurrency.entries()]
    .map(([currency, systemId]) => ({
      currency,
      systemId,
      label: CORRIDOR_LABELS[currency]?.label ?? currency,
      flag: CORRIDOR_LABELS[currency]?.flag ?? '💱',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
