import { Link } from 'react-router-dom'
import type { SearchColumn, SearchRow } from '../searchRows'
import { SEARCH_COLUMNS } from '../searchRows'
import { useT } from '../i18n'
import StatusBadge from './StatusBadge'
import ZekerheidBadge from './ZekerheidBadge'

export function useSearchHeaders(): Record<SearchColumn, string> {
  const t = useT()
  return {
    name: t('search.col.name'), type: t('search.col.type'), address: t('col.address'),
    activity: t('search.col.activity'), register: t('col.register'), status: t('col.status'),
    certainty: t('col.certainty'), contact: t('search.col.contact'),
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
      <tbody className="divide-y">{rows.map(({ record, cells, activitySource }) => <tr key={record.nr}>
        <td><Link to={`/record/${record.nr}`} className="font-medium text-blue-700 hover:underline">{cells.name}</Link><div className="text-xs text-gray-500">{record.nr}</div></td>
        <td>{cells.type}</td><td>{cells.address}</td>
        <td>{cells.activity}{activitySource && <div className="text-xs text-gray-500">{activitySource}</div>}</td>
        <td>{cells.register}</td>
        <td><StatusBadge status={record.assessment.status} label={record.assessment.status_label} /></td>
        <td><ZekerheidBadge certainty={record.assessment.certainty} label={record.assessment.certainty_label} /></td>
        <td className="text-xs text-gray-600" title={t('search.contactTitle')}>{cells.contact}</td>
      </tr>)}</tbody>
    </table>
  )
}
