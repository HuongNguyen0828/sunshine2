// web-admin/lib/normalize.ts

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const hasToDate = (v: unknown): v is { toDate: () => Date } =>
  isObject(v) && 'toDate' in v && typeof (v as Record<string, unknown>).toDate === 'function';

const hasSeconds = (v: unknown): v is { seconds: number; nanoseconds?: number } =>
  isObject(v) &&
  'seconds' in v &&
  typeof (v as Record<string, unknown>).seconds === 'number';

const hasUnderscoreSeconds = (v: unknown): v is { _seconds: number; _nanoseconds?: number } =>
  isObject(v) &&
  '_seconds' in v &&
  typeof (v as Record<string, unknown>)._seconds === 'number';

const getNumber = (obj: Record<string, unknown>, key: string): number | undefined => {
  const val = obj[key];
  return typeof val === 'number' ? val : undefined;
};

const isTimestampLike = (v: unknown): boolean =>
  hasToDate(v) || hasSeconds(v) || hasUnderscoreSeconds(v);

export const tsToIso = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return new Date(v).toISOString();

  if (hasToDate(v)) return v.toDate().toISOString();

  if (hasSeconds(v)) {
    const sec = v.seconds;
    const nsec = getNumber(v as Record<string, unknown>, 'nanoseconds') ?? 0;
    const ms = sec * 1000 + Math.floor(nsec / 1e6);
    return new Date(ms).toISOString();
  }

  if (hasUnderscoreSeconds(v)) {
    const sec = v._seconds;
    const nsec = getNumber(v as Record<string, unknown>, '_nanoseconds') ?? 0;
    const ms = sec * 1000 + Math.floor(nsec / 1e6);
    return new Date(ms).toISOString();
  }

  return String(v);
};

export const normalizeDatesDeep = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeDatesDeep(item)) as unknown as T;
  }

  if (isTimestampLike(input)) {
    return tsToIso(input) as unknown as T;
  }

  if (isObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = isTimestampLike(v) ? tsToIso(v) : normalizeDatesDeep(v);
    }
    return out as unknown as T;
  }

  return input;
};
