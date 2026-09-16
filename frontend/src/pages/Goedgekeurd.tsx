import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Proposal, ProposalStatus } from '../api'
import { KIND_LABELS, PROPOSAL_STATUS_LABELS, dash, exportUrl, getProposals, valueLabel } from '../api'
import { DecideButtons, ProposalStatusChip } from '../components/ProposalList'

const FILTERS: ProposalStatus[] = ['open', 'bevestigd', 'afgewezen']

export default function Goedgekeurd() {
  const [filter, setFilter] = useState<ProposalStatus>('bevestigd')
  const [items, setItems] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getProposals(filter)
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
  }, [filter, tick])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Goedgekeurde wijzigingen</h1>
          <p className="text-sm text-gray-600">Alleen bevestigde wijzigingen verlaten de tool.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.open(exportUrl('csv'))} className="rounded border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
            Exporteer CSV
          </button>
          <button type="button" onClick={() => window.open(exportUrl('json'))} className="rounded border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100">
            Exporteer JSON
          </button>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 ${f === filter ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            {PROPOSAL_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        {loading && <p className="p-4 text-sm text-gray-500">Laden…</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && items && items.length === 0 && <p className="p-4 text-sm text-gray-500">Geen resultaten</p>}
        {!loading && !error && items && items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Onderneming</th>
                <th className="px-3 py-2">Adres</th>
                <th className="px-3 py-2">Voorstel</th>
                <th className="px-3 py-2">Reden</th>
                <th className="px-3 py-2">Status</th>
                {filter === 'open' && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((p) => (
                <tr key={p.id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{(p.decided_at ?? p.created_at)?.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {p.record_nr ? (
                      <>
                        <Link to={`/record/${p.record_nr}`} className="font-medium text-blue-700 hover:underline">{p.record?.display_name ?? p.record_nr}</Link>
                        <div className="text-xs text-gray-500">{p.record_nr}</div>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{p.observed_name ?? p.display_name}</span>
                        <div className="text-xs text-gray-500">niet in register op dit adres</div>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{dash(p.record?.address ?? p.address)}</td>
                  <td className="px-3 py-2 text-gray-800">
                    {p.field && <span className="text-xs text-gray-500">{p.field}: </span>}
                    {p.kind === 'missing_establishment' ? (
                      <span className="text-xs text-gray-500">{KIND_LABELS[p.kind]}{p.observed_at ? ` · waargenomen ${p.observed_at}` : ''}</span>
                    ) : p.current_value || p.proposed_value ? (
                      <><span className="line-through text-gray-500">{valueLabel(p.current_value)}</span> → <span className="font-medium">{valueLabel(p.proposed_value)}</span></>
                    ) : (
                      <span className="text-xs text-gray-500">{KIND_LABELS[p.kind] ?? p.kind}</span>
                    )}
                  </td>
                  <td className="max-w-72 px-3 py-2 text-gray-700">{p.reason}</td>
                  <td className="px-3 py-2"><ProposalStatusChip status={p.status} /></td>
                  {filter === 'open' && <td className="px-3 py-2 whitespace-nowrap"><DecideButtons proposal={p} onDecided={reload} size="xs" /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
