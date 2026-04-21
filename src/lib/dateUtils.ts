import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const BRASILIA_TZ = 'America/Sao_Paulo';

export function getBrasiliaNow(): Date {
  return toZonedTime(new Date(), BRASILIA_TZ);
}

export function formatBrasilia(date: Date, formatStr: string, locale?: any): string {
  return formatInTimeZone(date, BRASILIA_TZ, formatStr, { locale });
}
