import type { BestRate, SystemMeta, PagoMovilInfo, Dataset } from './saldoar.types';

type Envelope<T> = { data: Array<{ id: string; attributes: T }> };

function attrsOf<T>(raw: unknown): Array<{ id: string; attributes: T }> {
  return (raw as Envelope<T>).data ?? [];
}

export function buildDataset(raw: {
  bestRates: unknown;
  systems: unknown;
  pagoMovilInfo: unknown;
}): Dataset {
  const rates: BestRate[] = attrsOf<BestRate>(raw.bestRates)
    .map((r) => r.attributes)
    .filter((a) => a.system2 === 'pago_movil' && a.currency2 === 'VES');

  const systems: Record<string, SystemMeta> = {};
  for (const s of attrsOf<any>(raw.systems)) {
    const a = s.attributes;
    systems[s.id] = {
      id: s.id,
      name: a.name,
      currency: a.currency,
      fixedFeeSend: a.fixed_fee_send ?? 0,
      percentFeeSend: a.percent_fee_send ?? 0,
      minSend: a.minimum_amount_send ?? 0,
      maxSend: a.maximum_amount_send ?? Number.POSITIVE_INFINITY,
    };
  }

  const pmRaw = raw.pagoMovilInfo as any;
  const pmAttrs = pmRaw.data?.attributes ?? pmRaw.data?.[0]?.attributes ?? {};
  const pagoMovilInfo: PagoMovilInfo = {
    timeAverage: pmAttrs.time_average ?? 0,
    onTimePercent: pmAttrs.on_time_percent ?? 0,
  };

  return { rates, systems, pagoMovilInfo };
}
