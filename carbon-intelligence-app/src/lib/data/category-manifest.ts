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

  business: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Purchased electricity',
      fields: [{ category: 'electricity.grid', label: 'Electricity purchased (all sites)', unit: 'kWh' }],
    },
    {
      id: 'scope1-stationary',
      title: 'Scope 1 — On-site fuel combustion',
      description: 'Backup generators, boilers, or other stationary equipment you own or control.',
      fields: [
        { category: 'stationary.fuel.diesel', label: 'Diesel (generators, boilers, etc.)', unit: 'L' },
        { category: 'stationary.fuel.lpg', label: 'LPG (generators, boilers, etc.)', unit: 'kg' },
      ],
    },
    {
      id: 'scope1-fleet',
      title: 'Scope 1 — Company-owned vehicles',
      fields: [
        { category: 'transport.fuel.petrol', label: 'Petrol (company fleet)', unit: 'L' },
        { category: 'transport.fuel.diesel', label: 'Diesel (company fleet)', unit: 'L' },
        { category: 'transport.fuel.cng', label: 'CNG (company fleet)', unit: 'kg' },
      ],
    },
    {
      id: 'scope3-travel',
      title: 'Scope 3 — Business travel',
      description: 'A configurable Scope 3 category — include the ones relevant to your business.',
      fields: [
        { category: 'transport.air.domestic', label: 'Domestic flights (business travel)', unit: 'passenger-km' },
        { category: 'transport.air.international', label: 'International flights (business travel)', unit: 'passenger-km' },
        { category: 'transport.public.rail', label: 'Rail travel (business travel)', unit: 'passenger-km' },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Waste',
      fields: [{ category: 'waste.landfill.mixed', label: 'Mixed waste to landfill', unit: 'kg' }],
    },
  ],

  campus: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Purchased electricity',
      fields: [{ category: 'electricity.grid', label: 'Electricity purchased (all buildings)', unit: 'kWh' }],
    },
    {
      id: 'scope1-cooking',
      title: 'Scope 1 — Cooking fuel (canteens/hostels)',
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
      id: 'scope1-stationary',
      title: 'Scope 1 — Backup generators',
      fields: [{ category: 'stationary.fuel.diesel', label: 'Diesel (backup generators)', unit: 'L' }],
    },
    {
      id: 'scope1-fleet',
      title: 'Scope 1 — Institution-owned vehicles',
      fields: [
        { category: 'transport.fuel.diesel', label: 'Diesel (owned buses/vehicles)', unit: 'L' },
        { category: 'transport.fuel.petrol', label: 'Petrol (owned vehicles)', unit: 'L' },
      ],
    },
    {
      id: 'scope3-commute',
      title: 'Scope 3 — Staff/student commute (estimate)',
      description: 'A configurable Scope 3 category — a simplified proxy, not a full commute survey.',
      fields: [
        { category: 'transport.public.bus', label: 'Bus travel (commute estimate)', unit: 'passenger-km' },
        { category: 'transport.public.rail', label: 'Rail travel (commute estimate)', unit: 'passenger-km' },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Waste',
      fields: [{ category: 'waste.landfill.mixed', label: 'Mixed waste to landfill', unit: 'kg' }],
    },
  ],

  event: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Venue electricity',
      description: 'For the duration of the event only.',
      fields: [{ category: 'electricity.grid', label: 'Electricity used (event duration)', unit: 'kWh' }],
    },
    {
      id: 'scope1-generators',
      title: 'Scope 1 — Generators',
      fields: [{ category: 'stationary.fuel.diesel', label: 'Diesel (event generators)', unit: 'L' }],
    },
    {
      id: 'scope3-attendee-travel',
      title: 'Scope 3 — Attendee travel (estimate)',
      description: 'A configurable Scope 3 category — estimate total attendee travel, not individual trips.',
      fields: [
        { category: 'transport.air.domestic', label: 'Domestic flights (attendees, total)', unit: 'passenger-km' },
        {
          category: 'transport.air.international',
          label: 'International flights (attendees, total)',
          unit: 'passenger-km',
        },
        { category: 'transport.public.rail', label: 'Rail travel (attendees, total)', unit: 'passenger-km' },
        { category: 'transport.public.bus', label: 'Bus/car travel (attendees, total)', unit: 'passenger-km' },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Event waste',
      fields: [{ category: 'waste.landfill.mixed', label: 'Mixed waste to landfill', unit: 'kg' }],
    },
  ],
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
