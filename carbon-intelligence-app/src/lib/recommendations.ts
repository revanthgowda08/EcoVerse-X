import type { CategoryResult } from './calc/types'

export interface Recommendation {
  category: string
  title: string
  assumption: string
  estimatedSavingsKgCO2e: string
  costImplication: string
  timeframe: string
}

/**
 * Rule-based recommendations keyed off a category that's actually
 * present and calculable in the user's own result — never generic
 * advice unrelated to what they reported. Explicitly NOT an AI-
 * generated value: this is a fixed lookup table, so it can never
 * override or contradict the deterministic emissions engine's own
 * numbers (per the PRD's requirement).
 */
const RULES: Record<string, (cat: CategoryResult) => Recommendation> = {
  'electricity.grid': (cat) => ({
    category: cat.category,
    title: 'Shift part of your electricity use to rooftop solar or a green tariff',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} and the grid factor used for this result.`,
    estimatedSavingsKgCO2e: `Up to ~${Math.round((cat.emissionsKgCO2e ?? 0) * 0.3)} kgCO2e/period if ~30% of this usage shifts to a zero-carbon source`,
    costImplication: 'Upfront cost for rooftop solar or a green-tariff premium; payback period varies by region and subsidy availability.',
    timeframe: '6–18 months to arrange, ongoing savings after',
  }),
  'transport.fuel.petrol': (cat) => ({
    category: cat.category,
    title: 'Reduce petrol vehicle-km through carpooling, public transit, or an EV/hybrid switch',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} of petrol.`,
    estimatedSavingsKgCO2e: `~${Math.round((cat.emissionsKgCO2e ?? 0) * 0.4)} kgCO2e/period if ~40% of this fuel use is avoided or shifted`,
    costImplication: 'No cost for carpooling/transit; upfront cost for an EV/hybrid switch, offset by lower running costs over time.',
    timeframe: 'Immediate for carpooling/transit; 1–3 years for a vehicle switch',
  }),
  'transport.fuel.diesel': (cat) => ({
    category: cat.category,
    title: 'Reduce diesel vehicle-km through carpooling, public transit, or route consolidation',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} of diesel.`,
    estimatedSavingsKgCO2e: `~${Math.round((cat.emissionsKgCO2e ?? 0) * 0.3)} kgCO2e/period if ~30% of this fuel use is avoided`,
    costImplication: 'Low cost — mostly a scheduling/routing change.',
    timeframe: 'Immediate to a few weeks',
  }),
  'transport.air.domestic': (cat) => ({
    category: cat.category,
    title: 'Consolidate domestic trips or substitute rail where journey time allows',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} of domestic air travel.`,
    estimatedSavingsKgCO2e: `~${Math.round((cat.emissionsKgCO2e ?? 0) * 0.5)} kgCO2e/period per trip substituted with rail`,
    costImplication: 'Often cost-neutral or cheaper; longer travel time is the main tradeoff.',
    timeframe: 'Per-trip, immediate',
  }),
  'transport.air.international': (cat) => ({
    category: cat.category,
    title: 'Combine international trips and consider longer, less frequent visits',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} of international air travel.`,
    estimatedSavingsKgCO2e: `Varies — depends on how many trips are consolidated`,
    costImplication: 'Potentially lower total travel cost from fewer trips.',
    timeframe: 'Plan over the next reporting period',
  }),
  'waste.landfill.mixed': (cat) => ({
    category: cat.category,
    title: 'Separate recyclables and compostables from landfill-bound waste',
    assumption: `Based on your reported ${cat.quantity} ${cat.quantityUnit} of mixed waste to landfill.`,
    estimatedSavingsKgCO2e: `~${Math.round((cat.emissionsKgCO2e ?? 0) * 0.5)} kgCO2e/period if ~50% is diverted to recycling/composting`,
    costImplication: 'Minimal — mostly a sorting habit change; some areas offer free compost collection.',
    timeframe: 'Immediate',
  }),
}

export function recommendationsFor(categories: CategoryResult[]): Recommendation[] {
  const calculable = categories.filter((c) => c.status === 'ok' && (c.emissionsKgCO2e ?? 0) > 0)
  return calculable
    .filter((c) => RULES[c.category])
    .sort((a, b) => (b.emissionsKgCO2e ?? 0) - (a.emissionsKgCO2e ?? 0))
    .slice(0, 3)
    .map((c) => RULES[c.category](c))
}
