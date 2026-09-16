import { Link } from 'react-router-dom'
import type { RecordSummary } from '../api'
import { RECORD_TYPE_LABELS, dash } from '../api'
import StatusBadge from './StatusBadge'

/** Compact card for a related record (parent enterprise or establishment). */
export default function RecordCard({ record, tag }: { record: RecordSummary; tag?: string }) {
  return (
    <div className="linked-record flex flex-wrap items-start justify-between gap-3 text-sm">
      <div className="min-w-0">
        <Link to={`/record/${record.nr}`} className="font-medium text-blue-700 hover:underline">
          {record.display_name || dash(record.name)}
        </Link>
        <span className="ml-1 text-xs text-gray-500">({RECORD_TYPE_LABELS[record.record_type] ?? record.record_type})</span>
        {tag && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{tag}</span>}
        <div className="text-xs text-gray-500">{record.nr} · {dash(record.address)}</div>
        {record.legal_form && <div className="text-xs text-gray-500">{record.legal_form}{record.legal_status ? ` · ${record.legal_status}` : ''}</div>}
      </div>
      <StatusBadge status={record.assessment.status} label={record.assessment.status_label} />
    </div>
  )
}
