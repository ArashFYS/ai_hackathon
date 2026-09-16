import type { Certainty } from '../api'
import { CERTAINTY_LABELS } from '../api'

const STYLES: Record<Certainty, string> = {
  hoog: 'bg-gray-800 text-white border-gray-800',
  middel: 'bg-white text-gray-800 border-gray-500',
  laag: 'bg-white text-gray-500 border-dashed border-gray-400',
}

export default function ZekerheidBadge({ certainty, label }: { certainty: Certainty; label?: string }) {
  const cls = STYLES[certainty] ?? STYLES.laag
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${cls}`} title="Zekerheid">
      {label ?? CERTAINTY_LABELS[certainty] ?? certainty}
    </span>
  )
}
