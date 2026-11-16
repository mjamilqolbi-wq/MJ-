import type { LoyaltyTier } from '../types.ts';

export function formatRupiah(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return amount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`;
  }
  return `${sign}Rp ${Math.round(abs)}`;
}

export function formatDateTimeID(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShortID(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatTimeID(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getTierDiscountPercent(tier?: LoyaltyTier): number {
  switch (tier) {
    case 'Platinum':
      return 8;
    case 'Gold':
      return 5;
    case 'Silver':
      return 3;
    default:
      return 0;
  }
}

export function computeTierFromSpend(totalSpend: number): LoyaltyTier {
  if (totalSpend >= 15_000_000) return 'Platinum';
  if (totalSpend >= 5_000_000) return 'Gold';
  if (totalSpend >= 1_500_000) return 'Silver';
  return 'Reguler';
}

export function getNextTierInfo(tier: LoyaltyTier, totalSpend: number): {
  nextTier: LoyaltyTier | null;
  remaining: number;
  progressPercent: number;
} {
  if (tier === 'Platinum') {
    return { nextTier: null, remaining: 0, progressPercent: 100 };
  }
  if (tier === 'Gold') {
    const target = 15_000_000;
    const base = 5_000_000;
    const progress = Math.min(100, Math.max(0, ((totalSpend - base) / (target - base)) * 100));
    return { nextTier: 'Platinum', remaining: Math.max(0, target - totalSpend), progressPercent: progress };
  }
  if (tier === 'Silver') {
    const target = 5_000_000;
    const base = 1_500_000;
    const progress = Math.min(100, Math.max(0, ((totalSpend - base) / (target - base)) * 100));
    return { nextTier: 'Gold', remaining: Math.max(0, target - totalSpend), progressPercent: progress };
  }
  const target = 1_500_000;
  const progress = Math.min(100, Math.max(0, (totalSpend / target) * 100));
  return { nextTier: 'Silver', remaining: Math.max(0, target - totalSpend), progressPercent: progress };
}
