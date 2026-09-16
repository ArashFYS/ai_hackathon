import type { NaceActivity, RecordSummary } from './api'
import { activitySectorLabel, activitySourceLabel, certaintyLabel, contactStatusLabel, dash, recordTypeLabel, registerLabel, statusLabel } from './labels'
import type { Lang } from './i18n'

export const SEARCH_COLUMNS = ['name', 'type', 'address', 'activity', 'register', 'status', 'certainty', 'contact', 'indicators'] as const
export type SearchColumn = typeof SEARCH_COLUMNS[number]
export interface SearchRow { record: RecordSummary; cells: Record<SearchColumn, string>; activitySource: string; activities: NaceActivity[] }

/** One line per KBO Public Search activity, for export: `Hoofd 4391001 Metselwerk (sinds 2025-01-01)`. */
export function activitiesText(activities: NaceActivity[], lang: Lang): string {
  return activities.map((a) => [a.kind === 'hoofd' ? (lang === 'nl' ? 'Hoofd' : 'Main') : (lang === 'nl' ? 'Neven' : 'Secondary'),
    a.code, a.title ?? '', a.since ? `(${lang === 'nl' ? 'sinds' : 'since'} ${a.since})` : ''].filter(Boolean).join(' ')).join('; ')
}

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
      indicators: ['kbo', 'google_maps', 'einvoice'].map((key) => {
        const indicator = record.indicators?.[key as keyof typeof record.indicators]
        return key + ': ' + (indicator?.label || '—')
      }).join(' · '),
    },
    activitySource: activitySourceLabel(lang, record.activity?.source) || '',
    activities: record.activity?.activities ?? [],
  }))
}

export function exportSearchRows(rows: SearchRow[], lang: Lang): string[][] {
  return rows.map(({ record, cells, activitySource, activities }) => [
    cells.name, record.nr, cells.type, cells.address,
    [cells.activity, activitySource, activitiesText(activities, lang)].filter(Boolean).join(' · '),
    cells.register, cells.status, cells.certainty, cells.contact, cells.indicators,
  ])
}
