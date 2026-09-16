import type { Status } from '../api'
import { STATUS_LABELS } from '../api'

export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span data-status={status} className="activity-status">
      {STATUS_LABELS[status] ?? label ?? status}
    </span>
  )
}
