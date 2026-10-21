import type { AssessmentResult } from './calc/types'

function csvEscape(value: string | number | null): string {
  const str = value === null ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

/**
 * Builds a CSV exactly mirroring the Category breakdown table: one row
 * per category, with enough columns (factor id/version/source) that
 * the export alone is traceable without the web page — same principle
 * as the rest of this engine, just in CSV form.
 */
export function assessmentResultToCsv(result: AssessmentResult): string {
  const header = [
    'category',
    'status',
    'quantity',
    'unit',
    'emissions_kg_co2e',
    'factor_id',
    'factor_version',
    'factor_source',
  ]
  const rows = result.categories.map((c) =>
    [c.category, c.status, c.quantity, c.quantityUnit, c.emissionsKgCO2e, c.factorId, c.factorVersion, c.factorSource]
      .map(csvEscape)
      .join(',')
  )
  const lines = [
    `# Ecoverse Carbon Intelligence — ${result.userType} assessment, ${result.reportingYear}, region ${result.region}`,
    `# Total: ${result.totalKgCO2e} kg CO2e (${result.totalTonnesCO2e} tonnes CO2e)`,
    `# Factor set: ${result.factorSetVersion} · Calculated: ${result.calculatedAt}`,
    `# Completeness: ${result.completeness.providedCategories}/${result.completeness.totalCategories} questions answered`,
    header.join(','),
    ...rows,
  ]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
