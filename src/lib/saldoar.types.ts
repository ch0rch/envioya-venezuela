export interface BestRate {
  price: number;
  system1: string;
  system2: string;
  currency1: string;
  currency2: string;
}

export interface SystemMeta {
  id: string;
  name: string;
  currency: string;
  fixedFeeSend: number;
  percentFeeSend: number;
  minSend: number;
  maxSend: number;
}

export interface PagoMovilInfo {
  timeAverage: number;
  onTimePercent: number;
}

export interface Dataset {
  rates: BestRate[];
  systems: Record<string, SystemMeta>;
  pagoMovilInfo: PagoMovilInfo;
}
