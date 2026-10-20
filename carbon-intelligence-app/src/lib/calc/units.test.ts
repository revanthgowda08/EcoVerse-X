import { describe, expect, it } from 'vitest'
import { convert, isKnownUnit } from './units'

describe('convert', () => {
  it('returns the same value when units match', () => {
    const result = convert(42, 'kWh', 'kWh')
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it('converts MWh to kWh', () => {
    const result = convert(2, 'MWh', 'kWh')
    expect(result.ok).toBe(true)
    expect(result.value).toBe(2000)
  })

  it('converts Wh to kWh', () => {
    const result = convert(2500, 'Wh', 'kWh')
    expect(result.ok).toBe(true)
    expect(result.value).toBeCloseTo(2.5, 10)
  })

  it('converts m3 to L', () => {
    const result = convert(1, 'm3', 'L')
    expect(result.ok).toBe(true)
    expect(result.value).toBe(1000)
  })

  it('converts kL to L', () => {
    const result = convert(0.5, 'kL', 'L')
    expect(result.ok).toBe(true)
    expect(result.value).toBe(500)
  })

  it('converts g to kg', () => {
    const result = convert(2500, 'g', 'kg')
    expect(result.ok).toBe(true)
    expect(result.value).toBeCloseTo(2.5, 10)
  })

  it('converts tonne to kg', () => {
    const result = convert(1.5, 'tonne', 'kg')
    expect(result.ok).toBe(true)
    expect(result.value).toBe(1500)
  })

  it('converts mile to km', () => {
    const result = convert(10, 'mile', 'km')
    expect(result.ok).toBe(true)
    expect(result.value).toBeCloseTo(16.09344, 5)
  })

  it('round-trips a conversion back to the original value', () => {
    const toKwh = convert(7.5, 'MWh', 'kWh')
    expect(toKwh.ok).toBe(true)
    const backToMwh = convert(toKwh.value as number, 'kWh', 'MWh')
    expect(backToMwh.ok).toBe(true)
    expect(backToMwh.value).toBeCloseTo(7.5, 10)
  })

  it('refuses to convert across dimensions (volume to mass)', () => {
    const result = convert(10, 'L', 'kg')
    expect(result.ok).toBe(false)
    expect(result.value).toBeNull()
    expect(result.message).toMatch(/different dimensions/i)
  })

  it('refuses to convert an unknown source unit', () => {
    const result = convert(10, 'barrel', 'L')
    expect(result.ok).toBe(false)
    expect(result.value).toBeNull()
    expect(result.message).toMatch(/unknown unit/i)
  })

  it('refuses to convert to an unknown target unit', () => {
    const result = convert(10, 'L', 'barrel')
    expect(result.ok).toBe(false)
    expect(result.value).toBeNull()
  })

  it('passes "count" dimension units through unchanged when units match', () => {
    const result = convert(120, 'passenger-km', 'passenger-km')
    expect(result).toEqual({ ok: true, value: 120 })
  })
})

describe('isKnownUnit', () => {
  it('recognizes defined units', () => {
    expect(isKnownUnit('kWh')).toBe(true)
    expect(isKnownUnit('passenger-km')).toBe(true)
  })

  it('rejects unknown units', () => {
    expect(isKnownUnit('furlong')).toBe(false)
  })
})
