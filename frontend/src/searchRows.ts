import type { RecordSummary } from './api'
import { activitySectorLabel, activitySourceLabel, certaintyLabel, contactStatusLabel, dash, recordTypeLabel, registerLabel, statusLabel } from './labels'
import type { Lang } from './i18n'

export const SEARCH_COLUMNS = ['name', 'type', 'address', 'activity', 'register', 'status', 'certainty', 'contact'] as const
export type SearchColumn = typeof SEARCH_COLUMNS[number]
export interface SearchRow { record: RecordSummary; cells: Record<SearchColumn, string>; activitySource: string }

export function makeSearchRows(records: RecordSummary[], lang: Lang): SearchRow[] {
  return records.map((record) => ({
    record,
    cells: {
      name: record.display_name || dash(record.name),
      type: recordTypeLabel(lang, record.record_type),
      address: dash(record.address),
      activity: activitySectorLabel(lang, record.activity?.sector, record.activity?.label),
      register: registerLabel(lang, record.assessment.register_label),
      status: statusLabel(lang, record.assessment.status),
      certainty: certaintyLabel(lang, record.assessment.certainty),
      contact: contactStatusLabel(lang, record.contact_status),
    },
    activitySource: activitySourceLabel(lang, record.activity?.source) || '',
  }))
}

export function exportSearchRows(rows: SearchRow[]): string[][] {
  return rows.map(({ record, cells, activitySource }) => [
    cells.name, record.nr, cells.type, cells.address,
    [cells.activity, activitySource].filter(Boolean).join(' · '),
    cells.register, cells.status, cells.certainty, cells.contact,
  ])
}
