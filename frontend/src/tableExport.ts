/** Displayed record data only: no correction proposals are included. */
export function spreadsheetCell(value: string): string {
  return /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value
}

export function serializeTable(headers: string[], rows: string[][], separator: ',' | '\t'): string {
  return [headers, ...rows].map((row) => row.map((value) => {
    const safe = spreadsheetCell(value)
    return separator === ',' ? `"${safe.replaceAll('"', '""')}"` : safe.replace(/[\t\r\n]+/g, ' ')
  }).join(separator)).join('\r\n')
}

export function sortTableRows<T>(rows: T[], value: (row: T) => string, locale: string, descending: boolean): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  return [...rows].sort((a, b) => collator.compare(value(a), value(b)) * (descending ? -1 : 1))
}
