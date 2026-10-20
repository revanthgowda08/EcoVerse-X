import { describe, expect, it } from 'vitest'
import { calculateAssessment, findFactor } from './engine'
import type { Assessment, EmissionFactor } from './types'

const factors: EmissionFactor[] = [
  {
    id: 'IN-ELEC-2024',
    category: 'electricity.grid',
    unit: 'kWh',
    value: 0.79,
    outputUnit: 'kgCO2e',
    region: 'IN',
    scope: 'scope2',
    source: 'Test Source A',
    publication: 'Test Pub A',
    effectiveYear: 2024,
    version: 1,
  },
  {
    id: 'IN-ELEC-2023',
    category: 'electricity.grid',
    unit: 'kWh',
    value: 0.82,
    outputUnit: 'kgCO2e',
    region: 'IN',
    scope: 'scope2',
    source: 'Test Source A',
    publication: 'Test Pub A',
    effectiveYear: 2023,
    version: 1,
  },
  {
    id: 'GLOBAL-PETROL',
    category: 'transport.fuel.petrol',
    unit: 'L',
    value: 2.31,
    outputUnit: 'kgCO2e',
    region: 'GLOBAL',
    scope: 'scope1',
    source: 'Test Source B',
    publication: 'Test Pub B',
    effectiveYear: 2006,
    version: 1,
    needsValidation: true,
  },
]

describe('findFactor', () => {
  it('prefers an exact region match over GLOBAL', () => {
    const f = findFactor(factors, 'electricity.grid', 'IN', 2024)
    expect(f?.id).toBe('IN-ELEC-2024')
  })

  it('falls back to GLOBAL when no exact-region factor exists', () => {
    const f = findFactor(factors, 'transport.fuel.petrol', 'IN', 2024)
    expect(f?.id).toBe('GLOBAL-PETROL')
  })

  it('selects the factor vintage at or before the reporting year, never a future one', () => {
    const f2023 = findFactor(factors, 'electricity.grid', 'IN', 2023)
    expect(f2023?.id).toBe('IN-ELEC-2023')

    const f2024 = findFactor(factors, 'electricity.grid', 'IN', 2024)
    expect(f2024?.id).toBe('IN-ELEC-2024')
  })

  it('returns null when a reporting year predates every available factor', () => {
    const f = findFactor(factors, 'electricity.grid', 'IN', 2020)
    expect(f).toBeNull()
  })

  it('returns null for a category with no factor at all', () => {
    const f = findFactor(factors, 'transport.ferry', 'IN', 2024)
    expect(f).toBeNull()
  })
})

describe('calculateAssessment', () => {
  const expectedCategories = [
    { label: 'Electricity', categories: ['electricity.grid'] },
    { label: 'Petrol', categories: ['transport.fuel.petrol'] },
    { label: 'Waste', categories: ['waste.landfill.mixed'] },
  ]

  it('calculates a straightforward category correctly (quantity x factor)', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: 100, unit: 'kWh' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    const cat = result.categories[0]
    expect(cat.status).toBe('ok')
    expect(cat.emissionsKgCO2e).toBeCloseTo(79, 6)
    expect(result.totalKgCO2e).toBeCloseTo(79, 6)
  })

  it('converts units before applying the factor', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: 0.1, unit: 'MWh' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    // 0.1 MWh = 100 kWh -> 100 * 0.79
    expect(result.categories[0].emissionsKgCO2e).toBeCloseTo(79, 6)
  })

  it('NEVER treats a missing/skipped activity as zero — excludes it from the total and flags it', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [
        { category: 'electricity.grid', quantity: 100, unit: 'kWh' },
        { category: 'transport.fuel.petrol', quantity: null, unit: 'L' }, // skipped
      ],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)

    const petrol = result.categories.find((c) => c.category === 'transport.fuel.petrol')
    expect(petrol?.status).toBe('not_provided')
    expect(petrol?.provided).toBe(false)
    expect(petrol?.emissionsKgCO2e).toBeNull()

    // total must be exactly the electricity contribution — petrol must not
    // have silently contributed 0 in a way indistinguishable from "measured
    // and found to be zero"
    expect(result.totalKgCO2e).toBeCloseTo(79, 6)

    // and completeness must surface that it's missing, including a category
    // that was never in `inputs` at all (waste.landfill.mixed)
    expect(result.completeness.missingCategories.sort()).toEqual(['Petrol', 'Waste'].sort())
    expect(result.completeness.providedCategories).toBe(1)
    expect(result.completeness.totalCategories).toBe(3)
  })

  it('treats an explicit 0 differently from a skipped/null input', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'transport.fuel.petrol', quantity: 0, unit: 'L' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    const petrol = result.categories[0]
    // an explicit zero IS calculable (user affirmatively said "none") —
    // unlike `not_provided`, this is a real, reproducible answer
    expect(petrol.status).toBe('ok')
    expect(petrol.provided).toBe(true)
    expect(petrol.emissionsKgCO2e).toBe(0)
  })

  it('rejects a negative quantity rather than computing a negative emissions value', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: -5, unit: 'kWh' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.categories[0].status).toBe('invalid_quantity')
    expect(result.categories[0].emissionsKgCO2e).toBeNull()
    expect(result.totalKgCO2e).toBe(0)
  })

  it('flags a category with no matching factor instead of silently skipping it', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'transport.ferry', quantity: 50, unit: 'km' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.categories[0].status).toBe('no_factor_found')
    expect(result.categories[0].message).toMatch(/no emission factor found/i)
  })

  it('flags an unsupported unit conversion instead of silently misapplying the factor', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: 100, unit: 'L' }], // volume, not energy
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.categories[0].status).toBe('unit_conversion_unsupported')
    expect(result.categories[0].emissionsKgCO2e).toBeNull()
  })

  it('records exactly which factor id/version was used, for reproducibility', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2023,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: 100, unit: 'kWh' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.categories[0].factorId).toBe('IN-ELEC-2023')
    expect(result.categories[0].factorVersion).toBe(1)
    expect(result.factorSetVersion).toBeTruthy()
  })

  it('is a pure function: identical inputs against an identical factor set reproduce an identical result', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [
        { category: 'electricity.grid', quantity: 250, unit: 'kWh' },
        { category: 'transport.fuel.petrol', quantity: 40, unit: 'L' },
      ],
    }
    const resultA = calculateAssessment(assessment, factors, expectedCategories)
    const resultB = calculateAssessment(assessment, factors, expectedCategories)

    expect(resultA.totalKgCO2e).toBe(resultB.totalKgCO2e)
    expect(resultA.categories.map((c) => c.emissionsKgCO2e)).toEqual(
      resultB.categories.map((c) => c.emissionsKgCO2e)
    )
    expect(resultA.categories.map((c) => c.factorId)).toEqual(resultB.categories.map((c) => c.factorId))
  })

  it('surfaces containsUnvalidatedFactors when any calculable category used a needsValidation factor', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'transport.fuel.petrol', quantity: 10, unit: 'L' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.containsUnvalidatedFactors).toBe(true)
  })

  it('sums tonnes as kg / 1000', () => {
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'electricity.grid', quantity: 10000, unit: 'kWh' }],
    }
    const result = calculateAssessment(assessment, factors, expectedCategories)
    expect(result.totalKgCO2e).toBeCloseTo(7900, 6)
    expect(result.totalTonnesCO2e).toBeCloseTo(7.9, 6)
  })

  it('counts an option-based slot (e.g. "which cooking fuel") as satisfied when ANY of its alternative categories was answered', () => {
    // Regression test: an earlier version of the manifest listed the
    // abstract question name ("cooking") as the expected category
    // instead of the concrete resolved category ("cooking.lpg"), which
    // meant the slot could never be satisfied — it would show as
    // permanently missing even when answered.
    const cookingFactors: EmissionFactor[] = [
      ...factors,
      {
        id: 'LPG-TEST',
        category: 'cooking.lpg',
        unit: 'kg',
        value: 2.98,
        outputUnit: 'kgCO2e',
        region: 'GLOBAL',
        scope: 'scope1',
        source: 'Test',
        publication: 'Test',
        effectiveYear: 2006,
        version: 1,
      },
    ]
    const slotsWithCookingOption = [
      { label: 'Cooking fuel', categories: ['cooking.lpg', 'cooking.png'] },
    ]
    const assessment: Assessment = {
      userType: 'individual',
      reportingYear: 2024,
      region: 'IN',
      inputs: [{ category: 'cooking.lpg', quantity: 12, unit: 'kg' }],
    }
    const result = calculateAssessment(assessment, cookingFactors, slotsWithCookingOption)

    expect(result.completeness.missingCategories).toEqual([])
    expect(result.completeness.providedCategories).toBe(1)
    expect(result.completeness.completenessRatio).toBe(1)
  })
})
