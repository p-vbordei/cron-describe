/**
 * Validate a 5-field cron expression and produce a human-readable English description.
 *
 * Field order: minute hour day-of-month month day-of-week
 * Supports: `*`, integers, lists (`1,2,3`), ranges (`1-5`), steps (`*\/N`, `1-10/2`),
 * and 3-letter names in the month and day-of-week fields (`jan`, `mon`, ...).
 *
 * Non-standard (Quartz) seconds field and `?` are NOT supported.
 */

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

interface FieldSpec {
  min: number;
  max: number;
  names?: readonly string[];
}

const SPECS: FieldSpec[] = [
  { min: 0, max: 59 },                       // minute
  { min: 0, max: 23 },                       // hour
  { min: 1, max: 31 },                       // day-of-month
  { min: 1, max: 12, names: MONTH_NAMES },   // month
  { min: 0, max: 7, names: DAY_NAMES },      // day-of-week (7 = sunday)
];

const FIELD_LABEL = ["minute", "hour", "day-of-month", "month", "day-of-week"];

export interface ValidationOk {
  valid: true;
  description: string;
  fields: {
    minute: number[];
    hour: number[];
    dayOfMonth: number[];
    month: number[];
    dayOfWeek: number[];
  };
}

export interface ValidationErr {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationOk | ValidationErr;

function parseAtom(atom: string, spec: FieldSpec): number | null {
  const lower = atom.toLowerCase();
  if (spec.names) {
    const idx = spec.names.indexOf(lower as never);
    if (idx >= 0) return idx + spec.min;
  }
  if (!/^\d+$/.test(atom)) return null;
  const n = parseInt(atom, 10);
  if (n < spec.min || n > spec.max) return null;
  return n;
}

function expandField(raw: string, spec: FieldSpec, label: string): number[] | string {
  if (!raw) return `empty ${label} field`;
  const values = new Set<number>();
  for (const piece of raw.split(",")) {
    if (!piece) return `empty list entry in ${label}`;
    let step = 1;
    let body = piece;
    const slashIdx = piece.indexOf("/");
    if (slashIdx >= 0) {
      const stepStr = piece.slice(slashIdx + 1);
      body = piece.slice(0, slashIdx);
      if (!/^\d+$/.test(stepStr)) return `invalid step in ${label}: ${piece}`;
      step = parseInt(stepStr, 10);
      if (step <= 0) return `step must be > 0 in ${label}: ${piece}`;
    }
    let lo: number;
    let hi: number;
    if (body === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (body.includes("-")) {
      const [a, b] = body.split("-");
      const av = parseAtom(a!, spec);
      const bv = parseAtom(b!, spec);
      if (av === null || bv === null) return `invalid range in ${label}: ${piece}`;
      if (av > bv) return `inverted range in ${label}: ${piece}`;
      lo = av;
      hi = bv;
    } else {
      const v = parseAtom(body, spec);
      if (v === null) return `invalid value in ${label}: ${piece}`;
      if (slashIdx >= 0) {
        lo = v;
        hi = spec.max;
      } else {
        values.add(v);
        continue;
      }
    }
    for (let i = lo; i <= hi; i += step) values.add(i);
  }
  return [...values].sort((a, b) => a - b);
}

function normalizeDow(values: number[]): number[] {
  // Cron allows 7 = Sunday; normalize to 0
  return [...new Set(values.map((v) => (v === 7 ? 0 : v)))].sort((a, b) => a - b);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isFull(values: number[], spec: FieldSpec): boolean {
  const expected = spec.max - spec.min + 1;
  if (spec === SPECS[4]) {
    // day-of-week: full = 7 distinct (0..6)
    return new Set(values).size === 7;
  }
  return values.length === expected;
}

function listJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function describeTime(minutes: number[], hours: number[]): string {
  const minuteSpec = SPECS[0]!;
  const hourSpec = SPECS[1]!;
  const minFull = isFull(minutes, minuteSpec);
  const hourFull = isFull(hours, hourSpec);

  if (minFull && hourFull) return "every minute";
  if (minutes.length === 1 && hours.length === 1) {
    return `at ${pad2(hours[0]!)}:${pad2(minutes[0]!)}`;
  }
  if (minutes.length === 1 && hourFull) {
    return `at ${minutes[0]} minutes past every hour`;
  }
  if (minFull && hours.length === 1) {
    return `every minute of hour ${hours[0]}`;
  }
  // Lists
  if (minutes.length === 1) {
    const hoursStr = listJoin(hours.map((h) => pad2(h)));
    return `at ${pad2(minutes[0]!)} past hours ${hoursStr}`;
  }
  if (hours.length === 1) {
    const minutesStr = listJoin(minutes.map((m) => String(m)));
    return `at minutes ${minutesStr} of hour ${pad2(hours[0]!)}`;
  }
  return `at minutes ${listJoin(minutes.map(String))} of hours ${listJoin(hours.map(pad2))}`;
}

function describeDom(values: number[]): string | null {
  if (isFull(values, SPECS[2]!)) return null;
  return `on day-of-month ${listJoin(values.map(String))}`;
}

function describeMonth(values: number[]): string | null {
  if (isFull(values, SPECS[3]!)) return null;
  return `in ${listJoin(values.map((m) => MONTH_LONG[m - 1]!))}`;
}

function describeDow(values: number[]): string | null {
  const normalized = normalizeDow(values);
  if (new Set(normalized).size === 7) return null;
  if (normalized.length === 5 && normalized.join(",") === "1,2,3,4,5") return "on weekdays";
  if (normalized.length === 2 && normalized.join(",") === "0,6") return "on weekends";
  return `on ${listJoin(normalized.map((d) => DAY_LONG[d]!))}`;
}

/**
 * Validate a 5-field cron expression and return a description plus expanded field sets.
 */
export function describe(input: string): ValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "expected string input" };
  }
  const tokens = input.trim().split(/\s+/);
  if (tokens.length !== 5) {
    return { valid: false, error: `expected 5 fields, got ${tokens.length}` };
  }

  const expanded: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const out = expandField(tokens[i]!, SPECS[i]!, FIELD_LABEL[i]!);
    if (typeof out === "string") return { valid: false, error: out };
    expanded.push(out);
  }

  const minutes = expanded[0]!;
  const hours = expanded[1]!;
  const dom = expanded[2]!;
  const month = expanded[3]!;
  const dow = expanded[4]!;

  const parts: string[] = [describeTime(minutes, hours)];
  const dowDesc = describeDow(dow);
  const domDesc = describeDom(dom);
  const monthDesc = describeMonth(month);
  if (dowDesc) parts.push(dowDesc);
  if (domDesc) parts.push(domDesc);
  if (monthDesc) parts.push(monthDesc);

  return {
    valid: true,
    description: parts.join(" "),
    fields: {
      minute: minutes,
      hour: hours,
      dayOfMonth: dom,
      month: month,
      dayOfWeek: normalizeDow(dow),
    },
  };
}

/** Convenience: returns just `true`/`false`. */
export function isValid(input: string): boolean {
  return describe(input).valid;
}

export default describe;
