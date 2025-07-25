// Pick function - selects specific properties from an object
export function pick<T, K extends keyof T>(obj: T, keys: K[] | readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    result[key] = obj[key];
  });
  return result;
}

// Omit function - excludes specific properties from an object
export function omit<T, K extends keyof T>(obj: T, keys: K[] | readonly K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

// ...existing code...

// how many milliseconds are in each unit
const msUnits = {
  ms: 1,
  s: 1000
} as const;

/**
 * Parse CSS time value and convert to milliseconds
 * @param time - CSS time value (e.g., "0.4s", "400ms", "0.4", 400)
 * @returns time in milliseconds
 */
export function getMilliseconds(time: string | number): number {
  // if already a number, return as-is
  if (typeof time === 'number') {
    return time;
  }

  // parse string time value
  const matches = time.match(/^([\d.]+)(\w*)$/);
  if (!matches) {
    return 0;
  }

  const num = parseFloat(matches[1]);
  const unit = (matches[2] || 'ms') as 'ms' | 's'; // default to ms if no unit

  return (msUnits[unit] || 1) * num;
}
