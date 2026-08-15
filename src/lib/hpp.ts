import type { ResepProdukWithBahan } from './types';

export function calculateHpp(resep: ResepProdukWithBahan[]): number {
  return resep.reduce(
    (sum, item) => sum + (item.jumlah_dibutuhkan || 0) * (item.bahan_baku?.harga_beli_per_satuan || 0),
    0,
  );
}

export function calculateMargin(hpp: number, hargaJual: number): number {
  return (hargaJual || 0) - (hpp || 0);
}

export function calculateMarginPercent(hpp: number, hargaJual: number): number {
  if (hargaJual <= 0) return 0;
  return ((hargaJual - hpp) / hargaJual) * 100;
}

export function calculateDepreciationPerMonth(nilai: number, umurBulan: number): number {
  if (umurBulan <= 0) return 0;
  return (nilai || 0) / umurBulan;
}

export function calculateEffectiveHpp(hpp: number, wastePercent: number): number {
  return hpp * (1 + (wastePercent || 0) / 100);
}

export function calculateRecommendedPrice(hpp: number, targetMarginPercent: number): number {
  const marginDecimal = (targetMarginPercent || 0) / 100;
  if (marginDecimal >= 1) return 0;
  return hpp / (1 - marginDecimal);
}

export function roundToNiceNumber(value: number): number {
  if (value <= 0) return 0;
  if (value < 10000) return Math.ceil(value / 500) * 500;
  if (value < 100000) return Math.ceil(value / 1000) * 1000;
  if (value < 1000000) return Math.ceil(value / 5000) * 5000;
  return Math.ceil(value / 50000) * 50000;
}

export type MarginStatus = 'healthy' | 'warning' | 'danger';

export function getMarginStatus(marginPct: number, minimumWarning: number): MarginStatus {
  if (marginPct < 0) return 'danger';
  if (marginPct < minimumWarning) return 'warning';
  return 'healthy';
}
