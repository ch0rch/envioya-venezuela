export function formatVes(n: number): string {
  const rounded = Math.round(n);
  const grouped = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(rounded);
  return `${grouped} Bs`;
}
