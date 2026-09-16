import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Proposal, Status, StreetCount, StreetOverview, StreetRecord, StreetRefreshResult } from '../api'
import { STATUS_CODES, dash, getStreet, getStreets, proposalTextLabel, refreshStreetIndicators, registerLabel, statusLabel, valueLabel } from '../api'
import type { TKey } from '../i18n'
import { useLang, useT } from '../i18n'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import IndicatorLights from '../components/IndicatorLights'
import { DecideButtons } from '../components/ProposalList'
import ActivitySelect from '../components/ActivitySelect'
import MissingEstablishmentForm, { MissingRow, missingHousenr } from '../components/MissingEstablishmentForm'

const DEFAULT_STREET = 'Paalstraat'

function nameHintKey(r: StreetRecord): TKey {
  if (r.record_type === 'enterprise') return 'street.hint.enterprise'
  if (r.parent_in_dataset === false) return 'street.hint.noParent'
  return r.seat_elsewhere ? 'street.hint.seatElsewhere' : 'street.hint.establishment'
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
  const t = useT()
  const { lang } = useLang()
  const { street: streetParam } = useParams<{ street: string }>()
  const navigate = useNavigate()
  const street = streetParam ? decodeURIComponent(streetParam) : DEFAULT_STREET
  const [streets, setStreets] = useState<StreetCount[] | null>(null)
  const [data, setData] = useState<StreetOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<Status | ''>('')
  const [activity, setActivity] = useState('')
  // null = closed; { } = form at the top (house number empty); { group } = inline under that address group
  const [form, setForm] = useState<{ group?: string } | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((x) => x + 1), [])
  // "Controleer straat": sequential Peppol lookups for every record (cached server-side, TICKET-033)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)

  const checkStreet = () => {
    setChecking(true)
    setCheckResult(null)
    refreshStreetIndicators(street)
      .then((res: StreetRefreshResult) => {
        const fmt = (c: Record<string, number>) => t('indicators.tally', c)
        setCheckResult(t('street.checkResult', { records: res.records, maps: fmt(res.google_maps), einvoice: fmt(res.einvoice) }))
        reload()
      })
      .catch(() => setCheckResult(t('street.checkFailed')))
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    getStreets().then(setStreets).catch(() => setStreets([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setForm(null)
    getStreet(street, activity || undefined)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [street, activity, tick])

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
        <h1 className="text-xl font-semibold">{t('street.title')}</h1>
        <p className="text-sm text-gray-600">{t('street.intro')}</p>
      </div>

      <div className="page-filters flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">{t('common.street')}</span>
          <select className="min-w-56 rounded border px-2 py-1.5" value={street} onChange={(e) => navigate(`/straat/${encodeURIComponent(e.target.value)}`)}>
            {streets === null && <option value={street}>{street}</option>}
            {streets && !streets.some((s) => s.street === street) && <option value={street}>{street}</option>}
            {streets?.map((s) => (
              <option key={s.street} value={s.street}>{s.street} ({s.count})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-600">{t('common.status')}</span>
          <select className="rounded border px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
            <option value="">{t('common.all')}</option>
            {STATUS_CODES.map((s) => (
              <option key={s} value={s}>{statusLabel(lang, s)}</option>
            ))}
          </select>
        </label>
        <ActivitySelect value={activity} onChange={setActivity} />
        {data && (
          <span className="pb-2 text-xs text-gray-500">
            {t('street.count', { total, addresses: data.addresses.length })}{missingCount > 0 ? t('street.missingCount', { n: missingCount }) : ''}
          </span>
        )}
        <Link to={`/kaart?street=${encodeURIComponent(street)}`} className="pb-2 text-xs text-blue-700 hover:underline">{t('street.showMap')}</Link>
        <button
          type="button"
          onClick={checkStreet}
          disabled={checking || loading}
          className="ml-auto mb-0.5 rounded border border-gray-800 bg-white px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          title={t('street.checkTitle')}
        >
          {checking ? t('street.checkBusy') : t('street.checkButton')}
        </button>
        <button type="button" className={`mb-0.5 ${missingBtn}`} disabled={!data} onClick={() => setForm({})}>
          + {t('missing.button')}
        </button>
        {checkResult && <span className="w-full text-xs text-gray-600">{checkResult}</span>}
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

      <div className="results-table overflow-x-auto">
        {loading && <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{t('common.loadError')}</p>}
        {!loading && !error && groups.length === 0 && <p className="p-4 text-sm text-gray-500">{t('common.noResults')}</p>}
        {!loading && !error && groups.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">{t('col.address')}</th>
                <th className="px-3 py-2">{t('street.col.business')}</th>
                <th className="px-3 py-2">{t('col.register')}</th>
                <th className="px-3 py-2">{t('street.col.evidence')}</th>
                <th className="px-3 py-2">{t('street.col.lastObserved')}</th>
                <th className="px-3 py-2">{t('col.certainty')}</th>
                <th className="px-3 py-2">{t('col.signals')}</th>
                <th className="px-3 py-2">{t('col.proposal')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((a) => (
                <Fragment key={a.address}>
                  <tr className="address-group">
                    <td colSpan={9} className="px-3 py-1.5 text-xs font-semibold text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <span>{a.address}</span>
                        <button type="button" className={missingBtn} onClick={() => setForm({ group: a.address })}>{t('missing.button')}</button>
                      </div>
                    </td>
                  </tr>
                  {form?.group === a.address && data && (
                    <tr>
                      <td colSpan={9} className="p-2">
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
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{a.housenr ? t('street.nr', { housenr: a.housenr }) : dash(a.housenr)}</td>
                      <td className="px-3 py-2">
                        <Link to={`/record/${r.nr}`} className="font-medium text-blue-700 hover:underline">{r.display_name || dash(r.name)}</Link>
                        <span className="ml-1 text-xs text-gray-500">{t(nameHintKey(r))}</span>
                        <div className="mt-0.5"><StatusBadge status={r.assessment.status} label={r.assessment.status_label} /></div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{registerLabel(lang, r.assessment.register_label)}</td>
                      <td className="max-w-64 px-3 py-2 text-gray-700">{r.last_evidence?.observation ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.last_evidence?.observed_at ?? r.assessment.last_observed ?? '—'}</td>
                      <td className="px-3 py-2"><ZekerheidBadge certainty={r.assessment.certainty} label={r.assessment.certainty_label} /></td>
                      <td className="px-3 py-2"><IndicatorLights indicators={r.indicators} /></td>
                      <td className="max-w-56 px-3 py-2 text-gray-800">
                        {proposalTextLabel(lang, r.assessment.proposal_text)}
                        {r.open_proposal && (
                          <div className="line-clamp-2 max-w-xs text-xs text-gray-500" title={r.open_proposal.reason}>
                            {t('street.openProposal')} {r.open_proposal.reason.split('; ')[0]}
                            {r.open_proposal.reason.includes('; ') ? ' …' : ''}
                            {r.open_proposal.proposed_value ? ` → ${valueLabel(lang, r.open_proposal.proposed_value)}` : ''}
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
