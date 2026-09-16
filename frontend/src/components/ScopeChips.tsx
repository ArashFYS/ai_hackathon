import { activitySectorLabel, certaintyLabel, contactStatusLabel, recordTypeLabel } from '../api'
import { readRecordQuery } from '../dashboard'
import { useLang, useT } from '../i18n'

export default function ScopeChips({ params, onClear }: { params: URLSearchParams; onClear: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const query = readRecordQuery(params)
  const labels = [
    query.municipality === '11040' ? 'Schoten' : query.municipality,
    query.type && recordTypeLabel(lang, query.type),
    query.activity && activitySectorLabel(lang, query.activity, query.activity),
    query.certainty && `${t('dashboard.certainty')}: ${certaintyLabel(lang, query.certainty)}`,
    query.contact && `${t('dashboard.contact')}: ${contactStatusLabel(lang, query.contact)}`,
    query.has_evidence !== undefined && t(query.has_evidence ? 'dashboard.evidence' : 'dashboard.noEvidence'),
    query.parent_missing && t('dashboard.parents'),
    params.get('linked') === 'false' && t('dashboard.unlinkedSelection'),
  ].filter(Boolean)
  if (!labels.length) return null
  return <div className="flex flex-wrap items-center gap-2 text-xs" aria-label={t('dashboard.scope')}>
    {labels.map((label) => <span className="rounded-full border bg-gray-50 px-3 py-1.5" key={String(label)}>{label}</span>)}
    <button type="button" className="px-2 text-blue-700 underline" onClick={onClear}>{t('dashboard.reset')}</button>
  </div>
}
