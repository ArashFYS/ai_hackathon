import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { RecordSummary, RecordType, Status } from '../api'
import { CONTACT_STATUS_LABELS, getRecords, RECORD_TYPE_LABELS, STATUS_LABELS, dash } from '../api'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'

export default function Zoeken() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? '') as RecordType | ''
  const status = (params.get('status') ?? '') as Status | ''
  const [input, setInput] = useState(q)
  const [items, setItems] = useState<RecordSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getRecords({ q, type, status, limit: 100 })
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) setError('Kon gegevens niet laden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q, type, status])

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Zoeken</h1>
        <p className="text-sm text-gray-600">
          Zoek een onderneming of vestiging om de registergegevens en het bewijs van activiteit te bekijken.
          {' '}Of bekijk een hele straat in het{' '}
          <Link to="/straat" className="text-blue-700 underline">Straatoverzicht</Link>.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: input.trim() })
        }}
      >
        <label className="flex min-w-64 flex-1 flex-col text-sm">
          <span className="mb-1 text-gray-600">Zoekterm</span>
          <input
            className="rounded border px-3 py-1.5"
            placeholder="Naam, ondernemingsnummer of straat"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">Type</span>
          <select className="rounded border px-2 py-1.5" value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Alle</option>
            <option value="enterprise">Onderneming</option>
            <option value="establishment">Vestiging</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">Status</span>
          <select className="rounded border px-2 py-1.5" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Alle</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
          Zoeken
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        {loading && <p className="p-4 text-sm text-gray-500">Laden…</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && items && items.length === 0 && <p className="p-4 text-sm text-gray-500">Geen resultaten</p>}
        {!loading && !error && items && items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Naam</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Adres</th>
                <th className="px-3 py-2">Register</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Zekerheid</th>
                <th className="px-3 py-2">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((r) => (
                <tr key={r.nr} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/record/${r.nr}`} className="font-medium text-blue-700 hover:underline">
                      {r.display_name || dash(r.name)}
                    </Link>
                    <div className="text-xs text-gray-500">{r.nr}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</td>
                  <td className="px-3 py-2 text-gray-700">{dash(r.address)}</td>
                  <td className="px-3 py-2 text-gray-700">{dash(r.assessment?.register_label)}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.assessment.status} label={r.assessment.status_label} /></td>
                  <td className="px-3 py-2"><ZekerheidBadge certainty={r.assessment.certainty} label={r.assessment.certainty_label} /></td>
                  <td className="px-3 py-2 text-xs text-gray-600" title="Contactgegevens: register · zetel · waargenomen">{CONTACT_STATUS_LABELS[r.contact_status] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {items && items.length >= 100 && (
        <p className="text-xs text-gray-500">Enkel de eerste 100 resultaten worden getoond. Verfijn de zoekterm.</p>
      )}
    </div>
  )
}
