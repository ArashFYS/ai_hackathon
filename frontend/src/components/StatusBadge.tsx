import type { Status } from '../api'
import { STATUS_LABELS } from '../api'

const COLOURS: Record<Status, string> = {
  actief: 'bg-green-100 text-green-800 border-green-300',
  ter_controle: 'bg-amber-100 text-amber-800 border-amber-300',
  waarschijnlijk_niet_actief: 'bg-red-100 text-red-800 border-red-300',
  geen_onderneming: 'bg-gray-100 text-gray-700 border-gray-300',
}

export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const cls = COLOURS[status] ?? COLOURS.geen_onderneming
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  )
}
