import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { NaceActivity } from '../api'
import type { SearchColumn, SearchRow } from '../searchRows'
import { SEARCH_COLUMNS } from '../searchRows'
import { useT } from '../i18n'
import StatusBadge from './StatusBadge'
import ZekerheidBadge from './ZekerheidBadge'
import IndicatorLights from './IndicatorLights'

export function useSearchHeaders(): Record<SearchColumn, string> {
  const t = useT()
  return {
    name: t('search.col.name'), type: t('search.col.type'), address: t('col.address'),
    activity: t('search.col.activity'), register: t('col.register'), status: t('col.status'),
    certainty: t('col.certainty'), contact: t('search.col.contact'), indicators: t('indicators.title'),
  }
}

export default function SearchResults({ rows, sort, descending, onSort }: {
  rows: SearchRow[]; sort: SearchColumn; descending: boolean; onSort: (column: SearchColumn) => void
}) {
  const t = useT()
  const headers = useSearchHeaders()
  return (
    <table className="w-full text-sm search-results-table">
      <thead className="text-left text-xs text-gray-500">
        <tr>{SEARCH_COLUMNS.map((column) => <th key={column} aria-sort={sort === column ? (descending ? 'descending' : 'ascending') : 'none'}>
          <button type="button" className="sort-heading" onClick={() => onSort(column)} aria-label={t('search.sortBy', { name: headers[column] })}>
            {headers[column]} <span aria-hidden="true">{sort === column ? (descending ? '↓' : '↑') : '↕'}</span>
          </button>
        </th>)}</tr>
      </thead>
      <tbody className="divide-y">{rows.map(({ record, cells, activitySource, activities }) => <tr key={record.nr}>
        <td><Link to={`/record/${record.nr}`} className="font-medium text-blue-700 hover:underline">{cells.name}</Link><div className="text-xs text-gray-500">{record.nr}</div></td>
        <td>{cells.type}</td><td>{cells.address}</td>
        <td>{cells.activity}{activitySource && <div className="text-xs text-gray-500">{activitySource}</div>}<ActivityList activities={activities} /></td>
        <td>{cells.register}</td>
        <td><StatusBadge status={record.assessment.status} label={record.assessment.status_label} /></td>
        <td><ZekerheidBadge certainty={record.assessment.certainty} label={record.assessment.certainty_label} /></td>
        <td className="text-xs text-gray-600" title={t('search.contactTitle')}>{cells.contact}</td>
        <td><IndicatorLights indicators={record.indicators} /></td>
      </tr>)}</tbody>
    </table>
  )
}

const ACTIVITY_PREVIEW = 3

/** KBO Public Search activities under the sector label (TICKET-042): first 3, the rest behind a toggle. */
function ActivityList({ activities }: { activities: NaceActivity[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  if (!activities.length) return null
  const shown = open ? activities : activities.slice(0, ACTIVITY_PREVIEW)
  const hidden = activities.length - ACTIVITY_PREVIEW
  return (
    <ul className="mt-1 space-y-0.5 text-xs">
      {shown.map((a, i) => (
        <li key={`${a.code}-${i}`} className="flex flex-wrap items-baseline gap-1">
          <span className={`rounded px-1 ${a.kind === 'hoofd' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>{t(`nacebel.kind.${a.kind}`)}</span>
          <span className="font-mono text-gray-600">{a.code}</span>
          <span className="text-gray-800">{a.title ?? '—'}</span>
          {a.since && <span className="text-gray-500">{t('nacebel.since', { date: a.since })}</span>}
        </li>
      ))}
      {hidden > 0 && (
        <li><button type="button" className="text-blue-700 underline" onClick={() => setOpen((v) => !v)}>
          {open ? t('search.activitiesLess') : t('search.activitiesMore', { count: hidden })}
        </button></li>
      )}
    </ul>
  )
}
