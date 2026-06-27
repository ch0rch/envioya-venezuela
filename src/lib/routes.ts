import type { Dataset } from './saldoar.types';

export type SortKey = 'amount' | 'speed';

export interface Route {
  systemId: string;
  systemName: string;
  arrivalVes: number;
  timeAverageMin: number;
  belowMin: boolean;
  minSend: number;
}

export function getRoutes(
  ds: Dataset,
  fromCurrency: string,
  amount: number,
  sort: SortKey,
): Route[] {
  const routes: Route[] = ds.rates
    .filter((r) => r.currency1 === fromCurrency)
    .map((r) => {
      const sys = ds.systems[r.system1];
      const minSend = sys?.minSend ?? 0;
      return {
        systemId: r.system1,
        systemName: sys?.name ?? r.system1,
        arrivalVes: amount * r.price,
        timeAverageMin: ds.pagoMovilInfo.timeAverage,
        belowMin: amount < minSend,
        minSend,
      };
    });

  const sorted = [...routes].sort((a, b) =>
    sort === 'speed'
      ? a.timeAverageMin - b.timeAverageMin
      : b.arrivalVes - a.arrivalVes,
  );
  return sorted;
}
