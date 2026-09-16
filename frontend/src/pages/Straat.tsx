import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Status, StreetCount, StreetOverview, StreetRecord, StreetRefreshResult } from '../api'
import { STATUS_LABELS, dash, getStreet, getStreets, refreshStreetIndicators, valueLabel } from '../api'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import IndicatorLights from '../components/IndicatorLights'
import { DecideButtons } from '../components/ProposalList'

const DEFAULT_STREET = 'Paalstraat'

function nameHint(r: StreetRecord): string {
  if (r.record_type === 'enterprise') return '(onderneming)'
  if (r.parent_in_dataset === false) return '(vestiging, moederonderneming niet in dataset)'
  return r.seat_elsewhere ? '(vestiging, zetel elders)' : '(vestiging)'
}

export default function Straat() {
  const { street: streetParam } = useParams<{ street: string }>()
  const navigate = useNavigate()
  const street = streetParam ? decodeURIComponent(streetParam) : DEFAULT_STREET
  const [streets, setStreets] = useState<StreetCount[] | null>(null)
  const [data, setData] = useState<StreetOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | ''>('')
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)

  const checkStreet = () => {
    setChecking(true)
    setCheckResult(null)
    refreshStreetIndicators(street)
      .then((res: StreetRefreshResult) => {
        const fmt = (c: Record<string, number>) => `${c.groen} groen, ${c.geel} geel, ${c.rood} rood, ${c.onbekend} onbekend`
        let msg = `${res.records} records gecontroleerd — Maps: ${fmt(res.google_maps)} · e-fact.: ${fmt(res.einvoice)}`
        setCheckResult(msg)
        reload()
      })
      .catch(() => setCheckResult('Controle mislukt'))
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    getStreets().then(setStreets).catch(() => setStreets([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getStreet(street)
      .then((d) => {
        if (!cancelled) setData(d)
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
  }, [street, tick])

  const addresses = (data?.addresses ?? [])
    .map((a) => ({ ...a, records: status ? a.records.filter((r) => r.assessment.status === status) : a.records }))
    .filter((a) => a.records.length > 0)
  const total = data?.addresses.reduce((n, a) => n + a.records.length, 0) ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Straatoverzicht</h1>
        <p className="text-sm text-gray-600">Alle ondernemingen en vestigingen in één straat, gegroepeerd per adres. Bevestig of wijs het voorstel per rij af.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm">
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">Straat</span>
          <select className="min-w-56 rounded border px-2 py-1.5" value={street} onChange={(e) => navigate(`/straat/${encodeURIComponent(e.target.value)}`)}>
            {streets === null && <option value={street}>{street}</option>}
            {streets && !streets.some((s) => s.street === street) && <option value={street}>{street}</option>}
            {streets?.map((s) => (
              <option key={s.street} value={s.street}>{s.street} ({s.count})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">Status</span>
          <select className="rounded border px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
            <option value="">Alle</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        {data && <span className="pb-2 text-xs text-gray-500">{total} records op {data.addresses.length} adressen</span>}
        <button
          type="button"
          onClick={checkStreet}
          disabled={checking || loading}
          className="ml-auto rounded border border-gray-800 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          title="Controleert de Peppol-registratie van elke onderneming in deze straat (resultaten worden 7 dagen bewaard)"
        >
          {checking ? 'Bezig… (kan een halve minuut duren)' : 'Controleer straat'}
        </button>
        {checkResult && <span className="w-full text-xs text-gray-600">{checkResult}</span>}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        {loading && <p className="p-4 text-sm text-gray-500">Laden…</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && addresses.length === 0 && <p className="p-4 text-sm text-gray-500">Geen resultaten</p>}
        {!loading && !error && addresses.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Adres</th>
                <th className="px-3 py-2">Onderneming / vestiging</th>
                <th className="px-3 py-2">Register</th>
                <th className="px-3 py-2">Bewijs van activiteit</th>
                <th className="px-3 py-2">Laatste waarneming</th>
                <th className="px-3 py-2">Zekerheid</th>
                <th className="px-3 py-2">Signalen</th>
                <th className="px-3 py-2">Voorstel</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {addresses.map((a) => (
                <Fragment key={a.address}>
                  <tr className="bg-gray-100">
                    <td colSpan={9} className="px-3 py-1.5 text-xs font-semibold text-gray-700">{a.address}</td>
                  </tr>
                  {a.records.map((r) => (
                    <tr key={r.nr} className="align-top hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{a.housenr ? `nr ${a.housenr}` : dash(a.housenr)}</td>
                      <td className="px-3 py-2">
                        <Link to={`/record/${r.nr}`} className="font-medium text-blue-700 hover:underline">{r.display_name || dash(r.name)}</Link>
                        <span className="ml-1 text-xs text-gray-500">{nameHint(r)}</span>
                        <div className="mt-0.5"><StatusBadge status={r.assessment.status} label={r.assessment.status_label} /></div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{dash(r.assessment.register_label)}</td>
                      <td className="max-w-64 px-3 py-2 text-gray-700">{r.last_evidence?.observation ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.last_evidence?.observed_at ?? r.assessment.last_observed ?? '—'}</td>
                      <td className="px-3 py-2"><ZekerheidBadge certainty={r.assessment.certainty} label={r.assessment.certainty_label} /></td>
                      <td className="px-3 py-2"><IndicatorLights indicators={r.indicators} /></td>
                      <td className="max-w-56 px-3 py-2 text-gray-800">
                        {r.assessment.proposal_text}
                        {r.open_proposal && (
                          <div className="text-xs text-gray-500">
                            Open voorstel: {r.open_proposal.reason}
                            {r.open_proposal.proposed_value ? ` → ${valueLabel(r.open_proposal.proposed_value)}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap"><DecideButtons proposal={r.open_proposal} onDecided={reload} size="xs" /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
