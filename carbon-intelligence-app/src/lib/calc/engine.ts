import type {
  ActivityInput,
  Assessment,
  AssessmentResult,
  CategoryResult,
  CompletenessSummary,
  EmissionFactor,
  ExpectedSlot,
} from './types'
import { convert } from './units'
import { DATASET_VERSION } from '../data/emission-factors'

/**
 * Find the best-matching factor for a category/region/year combination.
 *
 * Preference order: exact region match over "GLOBAL" fallback; among
 * matches, the highest `effectiveYear` that does not exceed the
 * assessment's reporting year; among ties, the highest `version`.
 *
 * Never guesses across categories or silently substitutes a different
 * activity's factor.
 */
export function findFactor(
  factors: EmissionFactor[],
  category: string,
  region: string,
  reportingYear: number
): EmissionFactor | null {
  const candidates = factors.filter(
    (f) => f.category === category && f.effectiveYear <= reportingYear && (f.region === region || f.region === 'GLOBAL')
  )
  if (candidates.length === 0) return null

  const exactRegion = candidates.filter((f) => f.region === region)
  const pool = exactRegion.length > 0 ? exactRegion : candidates

  return pool.reduce((best, f) => {
    if (!best) return f
    if (f.effectiveYear !== best.effectiveYear) return f.effectiveYear > best.effectiveYear ? f : best
    return f.version > best.version ? f : best
  }, pool[0])
}

function calculateCategory(
  input: ActivityInput,
  factors: EmissionFactor[],
  assessmentRegion: string,
  reportingYear: number
): CategoryResult {
  const region = input.region ?? assessmentRegion

  if (input.quantity === null || input.quantity === undefined) {
    return {
      category: input.category,
      scope: null,
      status: 'not_provided',
      provided: false,
      quantity: null,
      quantityUnit: null,
      factorId: null,
      factorVersion: null,
      factorSource: null,
      emissionsKgCO2e: null,
      message: 'No data provided for this activity — excluded from the total, not counted as zero.',
    }
  }

  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    return {
      category: input.category,
      scope: null,
      status: 'invalid_quantity',
      provided: true,
      quantity: input.quantity,
      quantityUnit: input.unit,
      factorId: null,
      factorVersion: null,
      factorSource: null,
      emissionsKgCO2e: null,
      message: `Quantity "${input.quantity}" is not a valid non-negative number.`,
    }
  }

  const factor = findFactor(factors, input.category, region, reportingYear)
  if (!factor) {
    return {
      category: input.category,
      scope: null,
      status: 'no_factor_found',
      provided: true,
      quantity: input.quantity,
      quantityUnit: input.unit,
      factorId: null,
      factorVersion: null,
      factorSource: null,
      emissionsKgCO2e: null,
      message: `No emission factor found for category "${input.category}" in region "${region}" (or GLOBAL fallback) at or before reporting year ${reportingYear}.`,
    }
  }

  const conversion = convert(input.quantity, input.unit, factor.unit)
  if (!conversion.ok || conversion.value === null) {
    return {
      category: input.category,
      scope: factor.scope,
      status: 'unit_conversion_unsupported',
      provided: true,
      quantity: input.quantity,
      quantityUnit: input.unit,
      factorId: factor.id,
      factorVersion: factor.version,
      factorSource: factor.source,
      emissionsKgCO2e: null,
      message: conversion.message ?? `Could not convert "${input.unit}" to "${factor.unit}" for category "${input.category}".`,
    }
  }

  const emissionsKgCO2e = conversion.value * factor.value

  return {
    category: input.category,
    scope: factor.scope,
    status: 'ok',
    provided: true,
    quantity: input.quantity,
    quantityUnit: input.unit,
    factorId: factor.id,
    factorVersion: factor.version,
    factorSource: factor.source,
    emissionsKgCO2e,
    uncertainty: factor.uncertainty,
    needsValidation: factor.needsValidation,
  }
}

/**
 * Run a full assessment against a factor set.
 *
 * `expectedSlots` drives the completeness summary — pass every
 * questionnaire slot for this user type (including ones the user
 * skipped), not just the categories present in `assessment.inputs`.
 * This is what lets the dashboard say "6 of 9 questions answered"
 * rather than silently treating a skipped questionnaire page as
 * zero-impact. A slot with multiple possible categories (an
 * option-based question) counts as answered if ANY of them was
 * provided — see ExpectedSlot's doc comment for why.
 */
export function calculateAssessment(
  assessment: Assessment,
  factors: EmissionFactor[],
  expectedSlots: ExpectedSlot[]
): AssessmentResult {
  const categories = assessment.inputs.map((input) =>
    calculateCategory(input, factors, assessment.region, assessment.reportingYear)
  )

  const answeredCategories = new Set(categories.filter((c) => c.provided).map((c) => c.category))
  const satisfiedSlots = expectedSlots.filter((slot) => slot.categories.some((c) => answeredCategories.has(c)))
  const missingCategories = expectedSlots
    .filter((slot) => !slot.categories.some((c) => answeredCategories.has(c)))
    .map((slot) => slot.label)

  const calculable = categories.filter((c) => c.status === 'ok')
  const totalKgCO2e = calculable.reduce((sum, c) => sum + (c.emissionsKgCO2e ?? 0), 0)

  const completeness: CompletenessSummary = {
    totalCategories: expectedSlots.length,
    providedCategories: satisfiedSlots.length,
    calculableCategories: calculable.length,
    missingCategories,
    completenessRatio: expectedSlots.length > 0 ? satisfiedSlots.length / expectedSlots.length : 0,
  }

  return {
    userType: assessment.userType,
    reportingYear: assessment.reportingYear,
    region: assessment.region,
    totalKgCO2e,
    totalTonnesCO2e: totalKgCO2e / 1000,
    categories,
    completeness,
    containsUnvalidatedFactors: calculable.some((c) => c.needsValidation),
    calculatedAt: new Date().toISOString(),
    factorSetVersion: DATASET_VERSION,
  }
}
