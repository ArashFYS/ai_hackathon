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
      setMsg('Moederonderneming opgehaald via VKBO.')
      onChanged()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMsg('Niet gevonden in VKBO.')
      else setMsg('Kon moederonderneming niet ophalen.')
    } finally {
      setBusy(false)
    }
  }

  if (record.record_type === 'establishment') {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-gray-600">
          Deze vestiging hoort bij onderneming{' '}
          <span className="font-mono">{record.parent_nr ?? 'onbekend'}</span>
          {seat_elsewhere && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">zetel elders</span>}
        </p>
        {parent ? (
          <RecordCard record={parent} tag={seat_elsewhere ? 'zetel elders' : undefined} />
        ) : (
          <div className="rounded border border-dashed bg-gray-50 px-3 py-2">
            <p className="text-gray-700">Moederonderneming niet in dataset</p>
            {record.parent_nr && (
              <button
                type="button"
                onClick={fetchViaVkbo}
                disabled={busy}
                className="mt-2 rounded border bg-white px-3 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {busy ? 'Ophalen…' : 'Haal op via VKBO'}
              </button>
            )}
          </div>
        )}
        {!parent_in_dataset && parent && <p className="text-xs text-gray-500">Moederonderneming opgehaald via VKBO (niet in de oorspronkelijke dataset).</p>}
        {msg && <p className="text-xs text-gray-600">{msg}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      {establishments.length === 0 ? (
        <p className="text-gray-600">Geen vestigingen van deze onderneming in de dataset.</p>
      ) : (
        <>
          <p className="text-gray-600">{establishments.length} vestiging(en) in de dataset:</p>
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
