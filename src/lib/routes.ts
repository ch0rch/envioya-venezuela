import type { Dataset } from './saldoar.types';

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

  // Always rank by bolívares delivered, descending.
  return [...routes].sort((a, b) => b.arrivalVes - a.arrivalVes);
}
