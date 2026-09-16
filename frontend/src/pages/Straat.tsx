import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Proposal, Status, StreetCount, StreetOverview, StreetRecord } from '../api'
import { STATUS_LABELS, dash, getStreet, getStreets, valueLabel } from '../api'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import { DecideButtons } from '../components/ProposalList'
import MissingEstablishmentForm, { MissingRow, missingHousenr } from '../components/MissingEstablishmentForm'

const DEFAULT_STREET = 'Paalstraat'
const MISSING_BUTTON = 'Vestiging ontbreekt op dit adres'

function nameHint(r: StreetRecord): string {
  if (r.record_type === 'enterprise') return '(onderneming)'
  if (r.parent_in_dataset === false) return '(vestiging, moederonderneming niet in dataset)'
  return r.seat_elsewhere ? '(vestiging, zetel elders)' : '(vestiging)'
}

interface Group {
  address: string
  housenr: string | null
  records: StreetRecord[]
  missing: Proposal[]
}

/** Natural sort, same as the backend's housenr_key: numeric prefix first, then the remaining text. */
function housenrKey(h: string | null): [number, string] {
  if (!h) return [1e9, '']
  const m = /^\d+/.exec(h)
  return [m ? parseInt(m[0], 10) : 1e9, h]
}

/** Address groups from the backend, with missing-establishment proposals merged in by house number. */
function buildGroups(data: StreetOverview, status: Status | ''): Group[] {
  const groups = new Map<string, Group>()
  for (const a of data.addresses) {
    const records = status ? a.records.filter((r) => r.assessment.status === status) : a.records
    groups.set(a.housenr ?? '', { address: a.address, housenr: a.housenr, records, missing: [] })
  }
  if (status === '' || status === 'ter_controle') {
    for (const p of data.missing ?? []) {
      const h = missingHousenr(p, data.street)
      const g = groups.get(h ?? '') ?? { address: [data.street, h].filter(Boolean).join(' '), housenr: h, records: [], missing: [] }
      groups.set(h ?? '', g)
      g.missing.push(p)
    }
  }
  return [...groups.values()]
    .filter((g) => g.records.length + g.missing.length > 0)
    .sort((a, b) => {
      const [na, sa] = housenrKey(a.housenr)
      const [nb, sb] = housenrKey(b.housenr)
      return na - nb || sa.localeCompare(sb)
    })
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
  // null = closed; { } = form at the top (house number empty); { group } = inline under that address group
  const [form, setForm] = useState<{ group?: string } | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    getStreets().then(setStreets).catch(() => setStreets([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setForm(null)
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

  const groups = data ? buildGroups(data, status) : []
  const total = data?.addresses.reduce((n, a) => n + a.records.length, 0) ?? 0
  const missingCount = data?.missing?.length ?? 0
  const first = data?.addresses[0]?.records[0]
  const postcode = first?.kbo_postcode ?? '2900'
  const municipality = first?.kbo_municipality ?? 'Schoten'
  const missingBtn = 'rounded border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50'

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
        {data && (
          <span className="pb-2 text-xs text-gray-500">
            {total} records op {data.addresses.length} adressen{missingCount > 0 ? ` · ${missingCount} niet in register` : ''}
          </span>
        )}
        <button type="button" className={`ml-auto mb-0.5 ${missingBtn}`} disabled={!data} onClick={() => setForm({})}>
          + {MISSING_BUTTON}
        </button>
      </div>

      {form && data && form.group === undefined && (
        <MissingEstablishmentForm
          street={data.street}
          postcode={postcode}
          municipality={municipality}
          onSaved={() => { setForm(null); reload() }}
          onCancel={() => setForm(null)}
        />
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        {loading && <p className="p-4 text-sm text-gray-500">Laden…</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && groups.length === 0 && <p className="p-4 text-sm text-gray-500">Geen resultaten</p>}
        {!loading && !error && groups.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Adres</th>
                <th className="px-3 py-2">Onderneming / vestiging</th>
                <th className="px-3 py-2">Register</th>
                <th className="px-3 py-2">Bewijs van activiteit</th>
                <th className="px-3 py-2">Laatste waarneming</th>
                <th className="px-3 py-2">Zekerheid</th>
                <th className="px-3 py-2">Voorstel</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((a) => (
                <Fragment key={a.address}>
                  <tr className="bg-gray-100">
                    <td colSpan={8} className="px-3 py-1.5 text-xs font-semibold text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <span>{a.address}</span>
                        <button type="button" className={missingBtn} onClick={() => setForm({ group: a.address })}>{MISSING_BUTTON}</button>
                      </div>
                    </td>
                  </tr>
                  {form?.group === a.address && data && (
                    <tr>
                      <td colSpan={8} className="p-2">
                        <MissingEstablishmentForm
                          street={data.street}
                          postcode={postcode}
                          municipality={municipality}
                          housenr={a.housenr ?? undefined}
                          onSaved={() => { setForm(null); reload() }}
                          onCancel={() => setForm(null)}
                        />
                      </td>
                    </tr>
                  )}
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
                  {a.missing.map((p) => (
                    <MissingRow key={`missing-${p.id}`} proposal={p} housenr={a.housenr} onDecided={reload} />
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
