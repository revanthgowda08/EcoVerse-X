import type { ExpectedSlot, UserType } from '../calc/types'

export interface CategoryFieldOption {
  value: string
  label: string
  /** The concrete emission-factor category this option resolves to. */
  category: string
  /** Options can have different natural units (e.g. LPG in kg, piped
   *  gas in m3) — never inherited from the parent field. */
  unit: string
}

export interface CategoryField {
  /** Must match an EmissionFactor.category exactly for a plain field.
   *  For an option-based field this is just an internal slot key (not
   *  a real emission-factor category) — the UI's in-progress answers
   *  are keyed by it, but calculation always uses the chosen option's
   *  own `category` and `unit` below, never this field-level one. */
  category: string
  label: string
  /** Unit for a plain field. Ignored for an option-based field — see
   *  CategoryFieldOption.unit instead. */
  unit: string
  helpText?: string
  /** Present for a field where the user first picks a type (fuel,
   *  diet) and both the category AND the unit depend on that choice. */
  options?: CategoryFieldOption[]
}

export interface QuestionnaireSection {
  id: string
  title: string
  description?: string
  fields: CategoryField[]
}

export const QUESTIONNAIRES: Record<UserType, QuestionnaireSection[]> = {
  individual: [
    {
      id: 'energy',
      title: 'Home energy (your share)',
      description: 'If you share a household, enter your personal share of the bill — the Household flow is for the whole home.',
      fields: [
        { category: 'electricity.grid', label: 'Electricity used', unit: 'kWh', helpText: 'From your bill, or an estimate of your personal share.' },
      ],
    },
    {
      id: 'cooking',
      title: 'Cooking fuel',
      fields: [
        {
          category: 'cooking',
          label: 'Primary cooking fuel',
          unit: 'kg',
          options: [
            { value: 'lpg', label: 'LPG cylinder', category: 'cooking.lpg', unit: 'kg' },
            { value: 'png', label: 'Piped natural gas (PNG)', category: 'cooking.png', unit: 'm3' },
          ],
        },
      ],
    },
    {
      id: 'transport',
      title: 'Transport',
      fields: [
        { category: 'transport.fuel.petrol', label: 'Petrol used (own vehicle)', unit: 'L' },
        { category: 'transport.fuel.diesel', label: 'Diesel used (own vehicle)', unit: 'L' },
        { category: 'transport.fuel.cng', label: 'CNG used (own vehicle)', unit: 'kg' },
        { category: 'transport.public.bus', label: 'Bus travel', unit: 'passenger-km' },
        { category: 'transport.public.rail', label: 'Rail travel', unit: 'passenger-km' },
      ],
    },
    {
      id: 'air-travel',
      title: 'Air travel',
      fields: [
        { category: 'transport.air.domestic', label: 'Domestic flights', unit: 'passenger-km' },
        { category: 'transport.air.international', label: 'International flights', unit: 'passenger-km' },
      ],
    },
    {
      id: 'food',
      title: 'Food',
      description: 'A simplified diet-type estimate — see the Methodology page for this factor\'s limitations.',
      fields: [
        {
          category: 'food.diet',
          label: 'Typical diet',
          unit: 'day',
          options: [
            { value: 'vegan', label: 'Vegan', category: 'food.diet.vegan', unit: 'day' },
            { value: 'vegetarian', label: 'Vegetarian', category: 'food.diet.vegetarian', unit: 'day' },
            { value: 'lowMeat', label: 'Low meat', category: 'food.diet.lowMeat', unit: 'day' },
            { value: 'highMeat', label: 'High meat', category: 'food.diet.highMeat', unit: 'day' },
          ],
        },
      ],
    },
    {
      id: 'waste',
      title: 'Waste',
      fields: [{ category: 'waste.landfill.mixed', label: 'Mixed waste to landfill', unit: 'kg' }],
    },
  ],

  household: [
    {
      id: 'energy',
      title: 'Household energy',
      fields: [{ category: 'electricity.grid', label: 'Total household electricity used', unit: 'kWh' }],
    },
    {
      id: 'cooking',
      title: 'Cooking fuel',
      fields: [
        {
          category: 'cooking',
          label: 'Primary cooking fuel',
          unit: 'kg',
          options: [
            { value: 'lpg', label: 'LPG cylinder', category: 'cooking.lpg', unit: 'kg' },
            { value: 'png', label: 'Piped natural gas (PNG)', category: 'cooking.png', unit: 'm3' },
          ],
        },
      ],
    },
    {
      id: 'transport',
      title: 'Household transport',
      fields: [
        { category: 'transport.fuel.petrol', label: 'Petrol used (all household vehicles)', unit: 'L' },
        { category: 'transport.fuel.diesel', label: 'Diesel used (all household vehicles)', unit: 'L' },
        { category: 'transport.fuel.cng', label: 'CNG used (all household vehicles)', unit: 'kg' },
        { category: 'transport.public.bus', label: 'Bus travel (household total)', unit: 'passenger-km' },
        { category: 'transport.public.rail', label: 'Rail travel (household total)', unit: 'passenger-km' },
      ],
    },
    {
      id: 'air-travel',
      title: 'Air travel',
      fields: [
        { category: 'transport.air.domestic', label: 'Domestic flights (household total)', unit: 'passenger-km' },
        { category: 'transport.air.international', label: 'International flights (household total)', unit: 'passenger-km' },
      ],
    },
    {
      id: 'waste',
      title: 'Waste',
      fields: [{ category: 'waste.landfill.mixed', label: 'Mixed waste to landfill', unit: 'kg' }],
    },
  ],

  // Business/campus/event questionnaires are scaffolded for a follow-up
  // iteration (Scope 1/2/3 category selection, org-level data) — not
  // built out in this pass.
  business: [],
  campus: [],
  event: [],
}

/** Every questionnaire slot for this user type, each listing every
 *  concrete emission-factor category that would satisfy it. An
 *  option-based field (cooking fuel, diet type) lists all of its
 *  options' resolved categories — answering any ONE of them satisfies
 *  the slot. Fed directly to calculateAssessment's completeness check. */
export function expectedSlotsFor(userType: UserType): ExpectedSlot[] {
  const sections = QUESTIONNAIRES[userType] ?? []
  const slots: ExpectedSlot[] = []
  for (const section of sections) {
    for (const field of section.fields) {
      slots.push({
        label: field.label,
        categories: field.options ? field.options.map((o) => o.category) : [field.category],
      })
    }
  }
  return slots
}
