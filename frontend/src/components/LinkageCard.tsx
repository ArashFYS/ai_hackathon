import { useState } from 'react'
import type { RecordDetail } from '../api'
import { ApiError, fetchParent } from '../api'
import RecordCard from './RecordCard'

interface Props {
  detail: RecordDetail
  onChanged: () => void
}

export default function LinkageCard({ detail, onChanged }: Props) {
  const { record, parent, parent_in_dataset, seat_elsewhere, establishments } = detail
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function fetchViaVkbo() {
    setBusy(true)
    setMsg(null)
    try {
      await fetchParent(record.nr)
      setMsg("Parent enterprise retrieved via VKBO.")
      onChanged()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMsg("Not found in VKBO.")
      else setMsg("Could not retrieve the parent enterprise.")
    } finally {
      setBusy(false)
    }
  }

  if (record.record_type === 'establishment') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-gray-600">
          This establishment belongs to enterprise{' '}
          <span className="font-mono">{record.parent_nr ?? "unknown"}</span>
          {seat_elsewhere && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">registered office elsewhere</span>}
        </p>
        {parent ? (
          <RecordCard record={parent} tag={seat_elsewhere ? "registered office elsewhere" : undefined} />
        ) : (
          <div className="linked-missing">
            <p className="text-gray-700">Parent enterprise not in dataset</p>
            {record.parent_nr && (
              <button
                type="button"
                onClick={fetchViaVkbo}
                disabled={busy}
                className="mt-2 rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {busy ? "Retrieving…" : "Retrieve via VKBO"}
              </button>
            )}
          </div>
        )}
        {!parent_in_dataset && parent && <p className="text-xs text-gray-500">Parent enterprise retrieved via VKBO (not in the original dataset).</p>}
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      {establishments.length === 0 ? (
        <p className="text-gray-600">No establishments for this enterprise in the dataset.</p>
      ) : (
        <>
          <p className="text-gray-600">{establishments.length} establishment(s) in the dataset:</p>
          <div className="space-y-1.5">
            {establishments.map((e) => (
              <RecordCard key={e.nr} record={e} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
