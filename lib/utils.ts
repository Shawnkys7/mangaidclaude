import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format total reading seconds into human-readable Indonesian time:
 * Menit, Jam, Hari, Bulan, dan Tahun.
 */
export function formatReadingDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  if (seconds === 0) return '0 Menit';
  if (seconds < 60) return `${seconds} Detik`;

  const totalMinutes = Math.floor(seconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const totalMonths = Math.floor(totalDays / 30);
  const totalYears = Math.floor(totalDays / 365);

  if (totalYears >= 1) {
    const remMonths = totalMonths % 12;
    const remDays = totalDays % 30;
    const parts = [`${totalYears} Tahun`];
    if (remMonths > 0) parts.push(`${remMonths} Bulan`);
    if (remDays > 0) parts.push(`${remDays} Hari`);
    return parts.join(' ');
  }

  if (totalMonths >= 1) {
    const remDays = totalDays % 30;
    const remHours = totalHours % 24;
    const parts = [`${totalMonths} Bulan`];
    if (remDays > 0) parts.push(`${remDays} Hari`);
    if (remHours > 0) parts.push(`${remHours} Jam`);
    return parts.join(' ');
  }

  if (totalDays >= 1) {
    const remHours = totalHours % 24;
    const remMins = totalMinutes % 60;
    const parts = [`${totalDays} Hari`];
    if (remHours > 0) parts.push(`${remHours} Jam`);
    if (remMins > 0) parts.push(`${remMins} Menit`);
    return parts.join(' ');
  }

  if (totalHours >= 1) {
    const remMins = totalMinutes % 60;
    if (remMins === 0) return `${totalHours} Jam`;
    return `${totalHours} Jam ${remMins} Menit`;
  }

  return `${totalMinutes} Menit`;
}

/**
 * Level system: Every 20 minutes = 2 levels.
 * That is: 10 minutes (600s) = 1 level.
 * Level = 1 + floor(seconds / 600)
 * Exp = floor(((seconds % 600) / 600) * 100)
 */
export function calculateLevelAndExp(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const level = 1 + Math.floor(seconds / 600);
  const exp = Math.floor(((seconds % 600) / 600) * 100);
  const nextLevelInSeconds = 600 - (seconds % 600);
  const nextLevelInMinutes = Math.ceil(nextLevelInSeconds / 60);

  return {
    level,
    exp,
    nextLevelInMinutes,
    totalSeconds: seconds,
  };
}
