import { describe, expect, it } from 'vitest'
import { QUESTIONNAIRES, expectedSlotsFor } from './category-manifest'
import { EMISSION_FACTORS } from './emission-factors'
import { findFactor } from '../calc/engine'
import type { UserType } from '../calc/types'

const USER_TYPES: UserType[] = ['individual', 'household', 'business', 'campus', 'event']
const CURRENT_YEAR = new Date().getFullYear()

describe('category-manifest / emission-factors consistency', () => {
  for (const userType of USER_TYPES) {
    it(`every questionnaire category for "${userType}" resolves to a real emission factor`, () => {
      const sections = QUESTIONNAIRES[userType]
      const categories: string[] = []
      for (const section of sections) {
        for (const field of section.fields) {
          if (field.options) {
            categories.push(...field.options.map((o) => o.category))
          } else {
            categories.push(field.category)
          }
        }
      }

      for (const category of categories) {
        // Region "IN" is what every built-in questionnaire assumes as the
        // default assessment region — same lookup the engine actually
        // does at calculation time (exact region, falling back to GLOBAL).
        const factor = findFactor(EMISSION_FACTORS, category, 'IN', CURRENT_YEAR)
        expect(factor, `No emission factor found for questionnaire category "${category}" (user type: ${userType})`).not.toBeNull()
      }
    })

    it(`expectedSlotsFor("${userType}") returns at least one slot`, () => {
      expect(expectedSlotsFor(userType).length).toBeGreaterThan(0)
    })
  }

  it('every option-based field has a unit on every option (no field-level unit fallback silently used)', () => {
    for (const userType of USER_TYPES) {
      for (const section of QUESTIONNAIRES[userType]) {
        for (const field of section.fields) {
          if (!field.options) continue
          for (const option of field.options) {
            expect(option.unit, `Option "${option.value}" on field "${field.category}" (${userType}) is missing a unit`).toBeTruthy()
          }
        }
      }
    }
  })

  it('new stationary-fuel factors used by business/campus/event exist', () => {
    expect(EMISSION_FACTORS.some((f) => f.category === 'stationary.fuel.diesel')).toBe(true)
    expect(EMISSION_FACTORS.some((f) => f.category === 'stationary.fuel.lpg')).toBe(true)
  })
})
