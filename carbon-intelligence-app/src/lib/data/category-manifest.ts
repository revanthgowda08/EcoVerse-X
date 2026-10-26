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

// Every quantity in this file is a reporting-period TOTAL (the page
// header shows which reporting year that is), never a monthly or
// instantaneous figure — stated explicitly in each section/field below
// rather than left to guesswork, since a monthly figure entered where
// an annual one was expected silently produces a result off by roughly
// 12x with no way for the engine to detect it.

export const QUESTIONNAIRES: Record<UserType, QuestionnaireSection[]> = {
  individual: [
    {
      id: 'energy',
      title: 'Home energy (your share)',
      description:
        'Your personal share of the bill, totalled for the reporting year — if you share a household, the Household flow covers the whole home instead.',
      fields: [
        {
          category: 'electricity.grid',
          label: 'Electricity used (annual)',
          unit: 'kWh',
          helpText:
            'Sum the kWh column across your bills for the year, or take your most recent bill\'s kWh and multiply by 12 as a rough stand-in. Your share only, if you split a household bill.',
        },
      ],
    },
    {
      id: 'cooking',
      title: 'Cooking fuel',
      description: 'Annual total for the reporting year.',
      fields: [
        {
          category: 'cooking',
          label: 'Primary cooking fuel',
          unit: 'kg',
          helpText:
            'LPG: a standard Indian domestic cylinder is 14.2 kg — multiply cylinders used this year by 14.2. PNG (piped gas): billed directly in m3 on your gas bill, enter that total as-is.',
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
      description: 'Fuel actually purchased/consumed over the year, not distance driven.',
      fields: [
        {
          category: 'transport.fuel.petrol',
          label: 'Petrol used (own vehicle, annual)',
          unit: 'L',
          helpText: 'Total litres filled across the year — check fuel receipts or estimate from average monthly spend ÷ local price per litre × 12.',
        },
        {
          category: 'transport.fuel.diesel',
          label: 'Diesel used (own vehicle, annual)',
          unit: 'L',
          helpText: 'Total litres filled across the year.',
        },
        {
          category: 'transport.fuel.cng',
          label: 'CNG used (own vehicle, annual)',
          unit: 'kg',
          helpText: 'For a CNG-converted car, auto, or taxi. CNG pumps in India bill by kg (not litres) — use the kg total from your fuel receipts.',
        },
        {
          category: 'transport.public.bus',
          label: 'Bus travel (annual)',
          unit: 'passenger-km',
          helpText: 'Passenger-km = distance of a trip × number of one-way trips. E.g. a 10 km commute, 5 days/week, 48 weeks: 10 × 2 × 5 × 48 = 4,800.',
        },
        {
          category: 'transport.public.rail',
          label: 'Rail travel (annual)',
          unit: 'passenger-km',
          helpText: 'Same approach as bus: trip distance × number of one-way trips across the year.',
        },
      ],
    },
    {
      id: 'air-travel',
      title: 'Air travel',
      description: 'Annual total across all flights taken.',
      fields: [
        {
          category: 'transport.air.domestic',
          label: 'Domestic flights (annual)',
          unit: 'passenger-km',
          helpText:
            'Passenger-km = one-way flight distance × number of one-way flights (a round trip counts as 2). Check your ticket for distance, or look up the airport-to-airport distance online.',
        },
        {
          category: 'transport.air.international',
          label: 'International flights (annual)',
          unit: 'passenger-km',
          helpText: 'Same approach as domestic flights — one-way distance × number of one-way flights, summed across the year.',
        },
      ],
    },
    {
      id: 'food',
      title: 'Food',
      description:
        'A simplified diet-type proxy, not a food diary — pick the closest match. Based on a UK dietary study (not India-specific); see the Methodology page for what that means for accuracy.',
      fields: [
        {
          category: 'food.diet',
          label: 'Typical diet',
          unit: 'day',
          helpText:
            'Vegan: no animal products at all. Vegetarian: no meat or fish. Low meat: meat occasionally, noticeably less than average. High meat: meat most days, more than roughly 100g/day (the source study\'s own "high" threshold). If none fits well, pick the closest — this is a rough category, not a precise log.',
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
      description: 'Annual total.',
      fields: [
        {
          category: 'waste.landfill.mixed',
          label: 'Mixed waste to landfill (annual)',
          unit: 'kg',
          helpText:
            'Only the portion that goes to landfill (not composted or recycled separately). No exact figure? CPCB/NEERI-based estimates put Indian urban waste generation very roughly between 0.2–0.6 kg/person/day depending on city size (~0.45 kg/day is a commonly cited average) — as a rough order-of-magnitude stand-in: your household size × that daily figure × 365.',
        },
      ],
    },
  ],

  household: [
    {
      id: 'energy',
      title: 'Household energy',
      description: 'Annual total for the whole home.',
      fields: [
        {
          category: 'electricity.grid',
          label: 'Total household electricity used (annual)',
          unit: 'kWh',
          helpText: 'Sum the kWh column across your bills for the year, or take a recent bill\'s kWh × 12 as a rough stand-in.',
        },
      ],
    },
    {
      id: 'cooking',
      title: 'Cooking fuel',
      description: 'Annual total for the whole home.',
      fields: [
        {
          category: 'cooking',
          label: 'Primary cooking fuel',
          unit: 'kg',
          helpText:
            'LPG: a standard Indian domestic cylinder is 14.2 kg — multiply cylinders used this year by 14.2. PNG (piped gas): billed directly in m3 on your gas bill, enter that total as-is.',
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
      description: 'Combined annual total across every vehicle/trip in the household.',
      fields: [
        {
          category: 'transport.fuel.petrol',
          label: 'Petrol used (all household vehicles, annual)',
          unit: 'L',
          helpText: 'Total litres filled across all household vehicles for the year.',
        },
        {
          category: 'transport.fuel.diesel',
          label: 'Diesel used (all household vehicles, annual)',
          unit: 'L',
          helpText: 'Total litres filled across all household vehicles for the year.',
        },
        {
          category: 'transport.fuel.cng',
          label: 'CNG used (all household vehicles, annual)',
          unit: 'kg',
          helpText: 'CNG pumps bill by kg, not litres — use the kg total from fuel receipts, summed across all household vehicles.',
        },
        {
          category: 'transport.public.bus',
          label: 'Bus travel (household total, annual)',
          unit: 'passenger-km',
          helpText: 'Sum of (trip distance × one-way trips) across every household member\'s bus travel for the year.',
        },
        {
          category: 'transport.public.rail',
          label: 'Rail travel (household total, annual)',
          unit: 'passenger-km',
          helpText: 'Same approach as bus travel, summed across the household.',
        },
      ],
    },
    {
      id: 'air-travel',
      title: 'Air travel',
      description: 'Combined annual total across every household member\'s flights.',
      fields: [
        {
          category: 'transport.air.domestic',
          label: 'Domestic flights (household total, annual)',
          unit: 'passenger-km',
          helpText: 'Passenger-km = one-way flight distance × number of one-way flights (round trip = 2), summed across the household.',
        },
        {
          category: 'transport.air.international',
          label: 'International flights (household total, annual)',
          unit: 'passenger-km',
          helpText: 'Same approach as domestic flights, summed across the household.',
        },
      ],
    },
    {
      id: 'waste',
      title: 'Waste',
      description: 'Annual total for the whole home.',
      fields: [
        {
          category: 'waste.landfill.mixed',
          label: 'Mixed waste to landfill (annual)',
          unit: 'kg',
          helpText:
            'Only the portion that goes to landfill (not composted or recycled separately). No exact figure? CPCB/NEERI-based estimates put Indian urban waste generation very roughly between 0.2–0.6 kg/person/day depending on city size (~0.45 kg/day is a commonly cited average) — as a rough order-of-magnitude stand-in: household size × that daily figure × 365.',
        },
      ],
    },
  ],

  business: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Purchased electricity',
      description: 'Annual total across all sites, from utility bills — the standard GHG Protocol Scope 2 boundary.',
      fields: [
        {
          category: 'electricity.grid',
          label: 'Electricity purchased (all sites, annual)',
          unit: 'kWh',
          helpText: 'Sum the kWh column across every site\'s utility bills for the reporting year.',
        },
      ],
    },
    {
      id: 'scope1-stationary',
      title: 'Scope 1 — On-site fuel combustion',
      description: 'Backup generators, boilers, or other stationary equipment your business owns or directly controls — common in India given grid power cuts. Annual total.',
      fields: [
        {
          category: 'stationary.fuel.diesel',
          label: 'Diesel (generators, boilers, etc., annual)',
          unit: 'L',
          helpText: 'Total litres consumed by owned/controlled stationary equipment across all sites for the year — not vehicle fuel (see Fleet below).',
        },
        {
          category: 'stationary.fuel.lpg',
          label: 'LPG (generators, boilers, etc., annual)',
          unit: 'kg',
          helpText: 'Commercial/bulk LPG cylinders (commonly 19 kg) are standard for this scale — multiply cylinders used by their actual kg rating, or use your supplier\'s kg total directly.',
        },
      ],
    },
    {
      id: 'scope1-fleet',
      title: 'Scope 1 — Company-owned vehicles',
      description: 'Fuel purchased for vehicles your business owns or leases under a finance lease — annual total.',
      fields: [
        { category: 'transport.fuel.petrol', label: 'Petrol (company fleet, annual)', unit: 'L', helpText: 'Total litres across all company-owned vehicles for the year.' },
        { category: 'transport.fuel.diesel', label: 'Diesel (company fleet, annual)', unit: 'L', helpText: 'Total litres across all company-owned vehicles for the year.' },
        { category: 'transport.fuel.cng', label: 'CNG (company fleet, annual)', unit: 'kg', helpText: 'CNG pumps bill by kg, not litres — use the kg total from fleet fuel records.' },
      ],
    },
    {
      id: 'scope3-travel',
      title: 'Scope 3 — Business travel',
      description:
        'A configurable Scope 3 category — include the ones relevant to your business. Annual total, employee business travel only (not commuting).',
      fields: [
        {
          category: 'transport.air.domestic',
          label: 'Domestic flights (business travel, annual)',
          unit: 'passenger-km',
          helpText: 'Passenger-km = one-way flight distance × number of one-way flights taken by employees for work, summed for the year.',
        },
        {
          category: 'transport.air.international',
          label: 'International flights (business travel, annual)',
          unit: 'passenger-km',
          helpText: 'Same approach as domestic flights, for international business travel.',
        },
        {
          category: 'transport.public.rail',
          label: 'Rail travel (business travel, annual)',
          unit: 'passenger-km',
          helpText: 'Trip distance × number of one-way trips, summed across employee business rail travel for the year.',
        },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Waste',
      description: 'Annual total.',
      fields: [
        {
          category: 'waste.landfill.mixed',
          label: 'Mixed waste to landfill (annual)',
          unit: 'kg',
          helpText:
            'Only the portion that goes to landfill (not recycled/composted separately). Check your waste contractor\'s weighbridge slips or collection invoices — these are usually far more accurate for a business than a per-person estimate.',
        },
      ],
    },
  ],

  campus: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Purchased electricity',
      description: 'Annual total across all buildings, from utility bills.',
      fields: [
        {
          category: 'electricity.grid',
          label: 'Electricity purchased (all buildings, annual)',
          unit: 'kWh',
          helpText: 'Sum the kWh column across every building\'s utility bills for the reporting year.',
        },
      ],
    },
    {
      id: 'scope1-cooking',
      title: 'Scope 1 — Cooking fuel (canteens/hostels)',
      description: 'Annual total across all canteens and hostel kitchens.',
      fields: [
        {
          category: 'cooking',
          label: 'Primary cooking fuel',
          unit: 'kg',
          helpText:
            'Institutional kitchens typically use commercial/bulk LPG cylinders (commonly 19 kg) rather than domestic 14.2 kg ones — use your supplier\'s actual kg total if available, or cylinders × their rated kg. PNG is billed directly in m3 on the gas bill.',
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
      description: 'Annual total.',
      fields: [
        {
          category: 'stationary.fuel.diesel',
          label: 'Diesel (backup generators, annual)',
          unit: 'L',
          helpText: 'Total litres consumed by campus-owned backup generators for the year.',
        },
      ],
    },
    {
      id: 'scope1-fleet',
      title: 'Scope 1 — Institution-owned vehicles',
      description: 'Buses, vans, or other vehicles the institution owns or leases — annual total.',
      fields: [
        { category: 'transport.fuel.diesel', label: 'Diesel (owned buses/vehicles, annual)', unit: 'L', helpText: 'Total litres across all institution-owned vehicles for the year.' },
        { category: 'transport.fuel.petrol', label: 'Petrol (owned vehicles, annual)', unit: 'L', helpText: 'Total litres across all institution-owned vehicles for the year.' },
      ],
    },
    {
      id: 'scope3-commute',
      title: 'Scope 3 — Staff/student commute (estimate)',
      description:
        'A simplified proxy, not a full commute survey — estimate if you don\'t have exact figures: (average one-way commute distance) × 2 × (commuting days in the year) × (number of regular commuters using that mode).',
      fields: [
        {
          category: 'transport.public.bus',
          label: 'Bus travel (commute estimate, annual)',
          unit: 'passenger-km',
          helpText: 'Total passenger-km for staff/students commuting by bus, for the year.',
        },
        {
          category: 'transport.public.rail',
          label: 'Rail travel (commute estimate, annual)',
          unit: 'passenger-km',
          helpText: 'Total passenger-km for staff/students commuting by rail, for the year.',
        },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Waste',
      description: 'Annual total across canteens, hostels, and academic buildings.',
      fields: [
        {
          category: 'waste.landfill.mixed',
          label: 'Mixed waste to landfill (annual)',
          unit: 'kg',
          helpText: 'Only the portion that goes to landfill. Check your waste contractor\'s records if the campus outsources collection — usually more accurate than estimating from headcount.',
        },
      ],
    },
  ],

  event: [
    {
      id: 'scope2-electricity',
      title: 'Scope 2 — Venue electricity',
      description: 'For the event\'s duration only, not the venue\'s normal operations.',
      fields: [
        {
          category: 'electricity.grid',
          label: 'Electricity used (event duration)',
          unit: 'kWh',
          helpText: 'From a venue meter reading specific to your event, or the venue\'s own estimate for an event of this size/duration.',
        },
      ],
    },
    {
      id: 'scope1-generators',
      title: 'Scope 1 — Generators',
      description: 'For the event\'s duration only.',
      fields: [
        {
          category: 'stationary.fuel.diesel',
          label: 'Diesel (event generators)',
          unit: 'L',
          helpText: 'Total litres consumed by generators brought in for the event, for its full duration.',
        },
      ],
    },
    {
      id: 'scope3-attendee-travel',
      title: 'Scope 3 — Attendee travel (estimate)',
      description:
        'A configurable Scope 3 category — estimate total attendee travel, not individual trips. If you collected travel mode/origin data at registration, use it; otherwise estimate: (typical one-way distance per mode) × 2 × (number of attendees using that mode).',
      fields: [
        {
          category: 'transport.air.domestic',
          label: 'Domestic flights (attendees, total)',
          unit: 'passenger-km',
          helpText: 'Sum of (one-way flight distance × one-way flights) across all attendees who flew domestically to/from the event.',
        },
        {
          category: 'transport.air.international',
          label: 'International flights (attendees, total)',
          unit: 'passenger-km',
          helpText: 'Same approach as domestic flights, for attendees who flew internationally.',
        },
        {
          category: 'transport.public.rail',
          label: 'Rail travel (attendees, total)',
          unit: 'passenger-km',
          helpText: 'Sum of (trip distance × one-way trips) across all attendees who travelled by rail.',
        },
        {
          category: 'transport.public.bus',
          label: 'Bus/car travel (attendees, total)',
          unit: 'passenger-km',
          helpText: 'Sum of (trip distance × one-way trips) across all attendees who travelled by bus or car.',
        },
      ],
    },
    {
      id: 'scope3-waste',
      title: 'Scope 3 — Event waste',
      description: 'For the event\'s duration only.',
      fields: [
        {
          category: 'waste.landfill.mixed',
          label: 'Mixed waste to landfill (event total)',
          unit: 'kg',
          helpText: 'Only the portion that goes to landfill (not recycled/composted separately). Check your waste vendor\'s invoice or bin-count records for the event if available.',
        },
      ],
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
