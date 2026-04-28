export type FieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export interface ParsedCron {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
  raw: Record<FieldName, string>;
  expression: string;
}

const FIELD_RANGES: Record<FieldName, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 7], // 7 normalized to 0 (Sunday)
};

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DOW_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const MACROS: Record<string, string> = {
  '@yearly':   '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly':  '0 0 1 * *',
  '@weekly':   '0 0 * * 0',
  '@daily':    '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly':   '0 * * * *',
};

export function parseCron(input: string): ParsedCron | { error: string } {
  let expr = input.trim().replace(/\s+/g, ' ');
  if (!expr) return { error: 'Empty expression' };

  if (expr.startsWith('@')) {
    const expanded = MACROS[expr.toLowerCase()];
    if (!expanded) return { error: `Unknown macro: ${expr}` };
    expr = expanded;
  }

  const fields = expr.split(' ');
  if (fields.length !== 5) {
    return { error: `Expected 5 fields (minute hour day month weekday), got ${fields.length}` };
  }

  const [minRaw, hourRaw, domRaw, monRaw, dowRaw] = fields as [string, string, string, string, string];

  const minute = parseField(minRaw, 'minute');
  if ('error' in minute) return minute;
  const hour = parseField(hourRaw, 'hour');
  if ('error' in hour) return hour;
  const dayOfMonth = parseField(domRaw, 'dayOfMonth');
  if ('error' in dayOfMonth) return dayOfMonth;
  const month = parseField(monRaw, 'month');
  if ('error' in month) return month;
  const dayOfWeek = parseField(dowRaw, 'dayOfWeek');
  if ('error' in dayOfWeek) return dayOfWeek;

  return {
    minute: minute.values,
    hour: hour.values,
    dayOfMonth: dayOfMonth.values,
    month: month.values,
    dayOfWeek: dayOfWeek.values,
    raw: { minute: minRaw, hour: hourRaw, dayOfMonth: domRaw, month: monRaw, dayOfWeek: dowRaw },
    expression: fields.join(' '),
  };
}

function parseField(field: string, name: FieldName): { values: number[] } | { error: string } {
  const [min, max] = FIELD_RANGES[name];

  let f = field.toUpperCase();
  if (name === 'month') {
    MONTH_NAMES.forEach((n, i) => { f = f.replaceAll(n, String(i + 1)); });
  } else if (name === 'dayOfWeek') {
    DOW_NAMES.forEach((n, i) => { f = f.replaceAll(n, String(i)); });
  }

  const set = new Set<number>();

  for (const piece of f.split(',')) {
    if (!piece) return { error: `Empty value in ${name}` };

    let step = 1;
    let base = piece;

    if (piece.includes('/')) {
      const parts = piece.split('/');
      if (parts.length !== 2) return { error: `Invalid step in ${name}: "${piece}"` };
      base = parts[0]!;
      step = parseInt(parts[1]!, 10);
      if (!Number.isInteger(step) || step <= 0) {
        return { error: `Invalid step "${parts[1]}" in ${name}` };
      }
    }

    let lo: number;
    let hi: number;
    if (base === '*') {
      lo = min; hi = max;
    } else if (base.includes('-')) {
      const parts = base.split('-');
      if (parts.length !== 2) return { error: `Invalid range "${base}" in ${name}` };
      lo = parseInt(parts[0]!, 10);
      hi = parseInt(parts[1]!, 10);
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
        return { error: `Invalid range "${base}" in ${name}` };
      }
    } else {
      lo = parseInt(base, 10);
      if (!Number.isInteger(lo)) return { error: `Invalid value "${base}" in ${name}` };
      hi = piece.includes('/') ? max : lo;
    }

    if (lo < min || lo > max) return { error: `${lo} out of range for ${name} (${min === 0 && name === 'dayOfWeek' ? 0 : min}-${name === 'dayOfWeek' ? 6 : max})` };
    if (hi < min || hi > max) return { error: `${hi} out of range for ${name} (${min === 0 && name === 'dayOfWeek' ? 0 : min}-${name === 'dayOfWeek' ? 6 : max})` };
    if (lo > hi) return { error: `Reversed range ${lo}-${hi} in ${name}` };

    for (let v = lo; v <= hi; v += step) set.add(v);
  }

  if (name === 'dayOfWeek' && set.has(7)) {
    set.delete(7);
    set.add(0);
  }

  return { values: Array.from(set).sort((a, b) => a - b) };
}

// ----- Description -----

const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function isContiguous(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i]! - values[i - 1]! !== 1) return false;
  }
  return true;
}

function detectStep(values: number[], min: number, max: number): number | null {
  if (values.length < 3) return null;
  const step = values[1]! - values[0]!;
  if (step < 2) return null;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! - values[i - 1]! !== step) return null;
  }
  if (values[0]! !== min) return null;
  if (values[values.length - 1]! + step <= max) return null;
  return step;
}

function joinList(items: string[], conj = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items[items.length - 1]}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function describeCron(p: ParsedCron): string {
  const minStar = p.raw.minute === '*';
  const hourStar = p.raw.hour === '*';
  const domStar = p.raw.dayOfMonth === '*';
  const monStar = p.raw.month === '*';
  const dowStar = p.raw.dayOfWeek === '*';

  // Time phrase (combination of minute + hour)
  const timePhrase = describeTimePhrase(p, minStar, hourStar);

  // Day phrase
  const parts: string[] = [timePhrase];

  // Month
  if (!monStar) {
    parts.push(`in ${describeMonth(p.month)}`);
  }

  // Day of month / day of week
  const domPhrase = !domStar ? `on day-of-month ${describeNumberSet(p.dayOfMonth, 1, 31)}` : '';
  const dowPhrase = !dowStar ? `on ${describeDow(p.dayOfWeek)}` : '';

  if (domPhrase && dowPhrase) {
    parts.push(`${domPhrase} or ${dowPhrase.replace(/^on /, '')}`);
  } else if (domPhrase) {
    parts.push(domPhrase);
  } else if (dowPhrase) {
    parts.push(dowPhrase);
  }

  return parts.filter(Boolean).join(' ');
}

function describeTimePhrase(p: ParsedCron, minStar: boolean, hourStar: boolean): string {
  // Both wildcards: every minute
  if (minStar && hourStar) return 'Every minute';

  // Specific minute, every hour
  if (!minStar && hourStar && p.minute.length === 1) {
    const m = p.minute[0]!;
    if (m === 0) return 'Every hour, on the hour';
    return `At ${m} minute${m === 1 ? '' : 's'} past every hour`;
  }

  // Step on minutes, every hour: */N * * * *
  const minStep = detectStep(p.minute, 0, 59);
  if (minStep && hourStar) return `Every ${minStep} minute${minStep === 1 ? '' : 's'}`;

  // Range on minutes, every hour
  if (hourStar && p.minute.length > 1 && isContiguous(p.minute)) {
    return `Every minute from ${p.minute[0]} through ${p.minute[p.minute.length - 1]} past every hour`;
  }

  // Specific minute(s) at specific hour(s) → "At HH:MM"
  if (!minStar && !hourStar && p.minute.length === 1 && p.hour.length === 1) {
    return `At ${pad2(p.hour[0]!)}:${pad2(p.minute[0]!)}`;
  }

  // Minute=0 with stepped hours: "Every N hours"
  if (!minStar && p.minute.length === 1 && p.minute[0] === 0) {
    const hourStep = detectStep(p.hour, 0, 23);
    if (hourStep) return `Every ${hourStep} hour${hourStep === 1 ? '' : 's'}`;
  }

  // Specific minutes at specific hours → list
  if (!minStar && !hourStar && p.minute.length === 1) {
    const m = p.minute[0]!;
    if (isContiguous(p.hour)) {
      return `At ${pad2(p.hour[0]!)}:${pad2(m)} through ${pad2(p.hour[p.hour.length - 1]!)}:${pad2(m)}`;
    }
    return `At minute ${m} of hour${p.hour.length === 1 ? '' : 's'} ${joinList(p.hour.map(String))}`;
  }

  // Stepped minutes within an hour range: */15 9-17 * * *
  if (minStep && !hourStar) {
    const hrPhrase = isContiguous(p.hour)
      ? `from ${pad2(p.hour[0]!)}:00 through ${pad2(p.hour[p.hour.length - 1]!)}:59`
      : `at hour${p.hour.length === 1 ? '' : 's'} ${joinList(p.hour.map(String))}`;
    return `Every ${minStep} minute${minStep === 1 ? '' : 's'} ${hrPhrase}`;
  }

  // Generic fallback
  const minPhrase = minStar ? 'every minute' : `at minute ${joinList(p.minute.map(String))}`;
  const hrPhrase = hourStar ? '' : ` of hour${p.hour.length === 1 ? '' : 's'} ${joinList(p.hour.map(String))}`;
  const cap = minPhrase.charAt(0).toUpperCase() + minPhrase.slice(1);
  return `${cap}${hrPhrase}`;
}

function describeNumberSet(values: number[], min: number, max: number): string {
  if (values.length === max - min + 1) return 'every value';
  const step = detectStep(values, min, max);
  if (step) return `every ${step}`;
  if (values.length > 1 && isContiguous(values)) {
    return `${values[0]} through ${values[values.length - 1]}`;
  }
  return joinList(values.map(String));
}

function describeMonth(values: number[]): string {
  if (values.length === 12) return 'every month';
  const step = detectStep(values, 1, 12);
  if (step) return `every ${step} months`;
  if (values.length > 1 && isContiguous(values)) {
    return `${MONTH_FULL[values[0]! - 1]} through ${MONTH_FULL[values[values.length - 1]! - 1]}`;
  }
  return joinList(values.map((v) => MONTH_FULL[v - 1]!));
}

function describeDow(values: number[]): string {
  if (values.length === 7) return 'every day-of-week';
  if (values.length > 1 && isContiguous(values)) {
    return `${DOW_FULL[values[0]!]} through ${DOW_FULL[values[values.length - 1]!]}`;
  }
  return joinList(values.map((v) => DOW_FULL[v]!));
}

// ----- Next runs (timezone-aware) -----

interface TzParts {
  year: number;
  month: number;   // 1-12
  day: number;     // 1-31
  hour: number;    // 0-23
  minute: number;  // 0-59
  weekday: number; // 0=Sun
}

const WEEKDAY_MAP: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

function getTzParts(d: Date, tz: string): TzParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // Some implementations report 24 for midnight
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    weekday: WEEKDAY_MAP[get('weekday')] ?? 0,
  };
}

function makeDateInTz(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const got = getTzParts(new Date(naive), tz);
  const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute);
  const diff = naive - gotUtc;
  return new Date(naive + diff);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function getNextRuns(p: ParsedCron, after: Date, count: number, timezone: string): Date[] {
  const results: Date[] = [];
  let startParts: TzParts;
  try {
    startParts = getTzParts(after, timezone);
  } catch {
    return [];
  }

  const domSet = new Set(p.dayOfMonth);
  const dowSet = new Set(p.dayOfWeek);
  const domRestricted = p.raw.dayOfMonth !== '*';
  const dowRestricted = p.raw.dayOfWeek !== '*';

  for (let y = startParts.year; y < startParts.year + 6 && results.length < count; y++) {
    for (const m of p.month) {
      const dim = daysInMonth(y, m);
      const validDays: number[] = [];

      for (let d = 1; d <= dim; d++) {
        const probe = makeDateInTz(y, m, d, 12, 0, timezone);
        const wd = getTzParts(probe, timezone).weekday;
        let valid: boolean;
        if (!domRestricted && !dowRestricted) valid = true;
        else if (domRestricted && !dowRestricted) valid = domSet.has(d);
        else if (!domRestricted && dowRestricted) valid = dowSet.has(wd);
        else valid = domSet.has(d) || dowSet.has(wd);
        if (valid) validDays.push(d);
      }

      for (const d of validDays) {
        for (const h of p.hour) {
          for (const mi of p.minute) {
            const cand = makeDateInTz(y, m, d, h, mi, timezone);
            if (cand.getTime() > after.getTime()) {
              results.push(cand);
              if (results.length >= count) return results;
            }
          }
        }
      }
    }
  }
  return results;
}

export function formatRun(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function relativeFromNow(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  let label: string;
  if (seconds < 5) label = 'just now';
  else if (seconds < 60) label = `${seconds} second${seconds === 1 ? '' : 's'}`;
  else if (minutes < 60) label = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) label = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (days < 7) label = `${days} day${days === 1 ? '' : 's'}`;
  else if (weeks < 5) label = `${weeks} week${weeks === 1 ? '' : 's'}`;
  else if (months < 12) label = `${months} month${months === 1 ? '' : 's'}`;
  else label = `${years} year${years === 1 ? '' : 's'}`;

  if (label === 'just now') return label;
  return isFuture ? `in ${label}` : `${label} ago`;
}

export const CRON_PRESETS: Array<{ expr: string; label: string }> = [
  { expr: '* * * * *',          label: 'Every minute' },
  { expr: '*/5 * * * *',        label: 'Every 5 minutes' },
  { expr: '*/15 * * * *',       label: 'Every 15 minutes' },
  { expr: '0 * * * *',          label: 'Every hour' },
  { expr: '0 */2 * * *',        label: 'Every 2 hours' },
  { expr: '0 0 * * *',          label: 'Daily at midnight' },
  { expr: '0 9 * * *',          label: 'Daily at 9 AM' },
  { expr: '0 9 * * 1-5',        label: 'Weekdays at 9 AM' },
  { expr: '*/15 9-17 * * 1-5',  label: 'Every 15 min, business hours' },
  { expr: '0 0 * * 0',          label: 'Weekly (Sundays)' },
  { expr: '0 0 1 * *',          label: 'Monthly (1st)' },
  { expr: '0 0 1 1 *',          label: 'Yearly (Jan 1)' },
];

export const CRON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];
