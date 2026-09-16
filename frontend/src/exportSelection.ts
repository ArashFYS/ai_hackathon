import type { Contact } from './api'

export type ExportMode = 'table' | 'emails' | 'phones' | 'custom'
export type ContactMap = Record<string, Contact[]>

function normalized(kind: string, value: string): string {
  if (kind !== 'phone') return value.trim().toLowerCase()
  let digits = value.replace(/\D/g, '').replace(/^00/, '')
  if (/^32\d{8,9}$/.test(digits)) digits = '0' + digits.slice(2)
  return digits
}

function uniqueValues(contacts: Contact[], kind: string): string[] {
  const seen = new Set<string>()
  return contacts.filter((contact) => contact.kind === kind).flatMap((contact) => {
    const key = normalized(kind, contact.value)
    if (!key || seen.has(key)) return []
    seen.add(key)
    return [contact.value.trim()]
  })
}

export function selectExport(
  headers: string[], rows: string[][], numbers: string[], mode: ExportMode,
  selected: string[], contacts: ContactMap, labels: Record<'email' | 'phone' | 'website', string>,
): { headers: string[]; rows: string[][]; plain: boolean } {
  if (mode === 'emails' || mode === 'phones') {
    const kind = mode === 'emails' ? 'email' : 'phone'
    const values = uniqueValues(numbers.flatMap((nr) => contacts[nr] || []), kind)
    return { headers: [labels[kind]], rows: values.map((value) => [value]), plain: true }
  }
  const columns = mode === 'table' ? headers.map((_, index) => String(index)) : selected
  return {
    headers: columns.map((column) => labels[column as keyof typeof labels] ?? headers[Number(column)]),
    rows: rows.map((row, index) => columns.map((column) =>
      column in labels ? uniqueValues(contacts[numbers[index]] || [], column).join('; ') : row[Number(column)])),
    plain: false,
  }
}
