import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats currency into Indian Lakhs (L) and Crores (Cr)
 */
export function formatIndianCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    const cr = (amount / 10000000).toFixed(2);
    return `₹${cr.replace(/\.00$/, '')} Cr`;
  }
  if (amount >= 100000) {
    const lk = (amount / 100000).toFixed(2);
    return `₹${lk.replace(/\.00$/, '')} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date?: string | Date | null, formatStr = 'dd MMM yyyy, hh:mm a'): string {
  if (!date) return '-';
  try {
    return format(new Date(date), formatStr);
  } catch {
    return '-';
  }
}

export function formatTimeAgo(date?: string | Date | null): string {
  if (!date) return '-';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '-';
  }
}

export function formatSecondsToTime(seconds = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
