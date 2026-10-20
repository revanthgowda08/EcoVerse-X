/**
 * Explicit unit conversion. Deliberately a closed, hand-written table
 * rather than a generic unit-parsing library: every conversion the
 * engine is capable of is listed here and can be audited in one place.
 * A pair not listed here is UNSUPPORTED, not approximated — see
 * `convert()`.
 */

export type Dimension = 'energy' | 'volume' | 'mass' | 'distance' | 'count'

interface UnitDef {
  dimension: Dimension
  /** Multiply a quantity in this unit by this factor to get the
   *  dimension's base unit (kWh for energy, L for volume, kg for mass,
   *  km for distance, count for count). */
  toBase: number
}

const UNITS: Record<string, UnitDef> = {
  // energy — base: kWh
  kWh: { dimension: 'energy', toBase: 1 },
  MWh: { dimension: 'energy', toBase: 1000 },
  Wh: { dimension: 'energy', toBase: 0.001 },

  // volume — base: liter
  L: { dimension: 'volume', toBase: 1 },
  liter: { dimension: 'volume', toBase: 1 },
  mL: { dimension: 'volume', toBase: 0.001 },
  'm3': { dimension: 'volume', toBase: 1000 },
  kL: { dimension: 'volume', toBase: 1000 },

  // mass — base: kg
  kg: { dimension: 'mass', toBase: 1 },
  g: { dimension: 'mass', toBase: 0.001 },
  tonne: { dimension: 'mass', toBase: 1000 },

  // distance — base: km
  km: { dimension: 'distance', toBase: 1 },
  m: { dimension: 'distance', toBase: 0.001 },
  mile: { dimension: 'distance', toBase: 1.609344 },

  // count — base: count (passenger-km, day, unit, etc. all pass through
  // as-is; the "unit" carries the semantics, conversion is a no-op)
  'passenger-km': { dimension: 'count', toBase: 1 },
  day: { dimension: 'count', toBase: 1 },
  unit: { dimension: 'count', toBase: 1 },
}

export interface ConversionResult {
  ok: boolean
  value: number | null
  message?: string
}

/**
 * Convert `value` from `fromUnit` to `toUnit`. Returns `ok: false` with
 * no value (never a silently-wrong number) when either unit is unknown
 * or the two units are not the same dimension.
 */
export function convert(value: number, fromUnit: string, toUnit: string): ConversionResult {
  if (fromUnit === toUnit) {
    return { ok: true, value }
  }

  const from = UNITS[fromUnit]
  const to = UNITS[toUnit]

  if (!from) {
    return { ok: false, value: null, message: `Unknown unit "${fromUnit}".` }
  }
  if (!to) {
    return { ok: false, value: null, message: `Unknown unit "${toUnit}".` }
  }
  if (from.dimension !== to.dimension) {
    return {
      ok: false,
      value: null,
      message: `Cannot convert "${fromUnit}" (${from.dimension}) to "${toUnit}" (${to.dimension}) — different dimensions.`,
    }
  }

  const inBase = value * from.toBase
  const converted = inBase / to.toBase
  return { ok: true, value: converted }
}

export function isKnownUnit(unit: string): boolean {
  return unit in UNITS
}
