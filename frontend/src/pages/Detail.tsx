import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { RecordDetail, RecordFull } from '../api'
import { CONCLUSION_LABELS, RECORD_TYPE_LABELS, SOURCE_LABELS, dash, getRecord, onbekend } from '../api'
import StatusBadge from '../components/StatusBadge'
import ConfidenceScore from '../components/ConfidenceScore'
import ReasonsList from '../components/ReasonsList'
import LinkageCard from '../components/LinkageCard'
import EvidenceForm from '../components/EvidenceForm'
import ProposalList from '../components/ProposalList'
import EvidencePanel from '../components/EvidencePanel'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800">{onbekend(value)}</dd>
    </div>
  )
}

function fmtAddr(street: string | null, nr: string | null, box: string | null, pc: string | null, mun: string | null): string | null {
  if (!street && !nr) return null
  const line = [street, nr, box ? `bus ${box}` : null].filter(Boolean).join(' ')
  const tail = [pc, mun].filter(Boolean).join(' ')
  return tail ? `${line}, ${tail}` : line
}

function RegisterFacts({ r }: { r: RecordFull }) {
  const kbo = fmtAddr(r.kbo_street, r.kbo_housenr, r.kbo_box, r.kbo_postcode, r.kbo_municipality)
  const ar = fmtAddr(r.ar_street, r.ar_housenr, r.ar_box, r.ar_postcode, r.kbo_municipality)
  const bothSet = Boolean(r.kbo_street && r.ar_street)
  const differs = bothSet && (r.kbo_street !== r.ar_street || (r.kbo_housenr ?? '') !== (r.ar_housenr ?? ''))
  return (
    <div className="space-y-3">
      <dl className="register-fields">
        <Field label="Legal form" value={r.legal_form} />
        <Field label="Legal status" value={r.legal_status} />
        <Field label="Type" value={r.entity_type ?? RECORD_TYPE_LABELS[r.record_type]} />
        <Field label="Start date" value={r.start_date} />
        <Field label="Registration date" value={r.registration_date} />
        <Field label="Staff size" value={r.staff_class} />
        {r.cessation_date && <Field label="Cessation" value={`${r.cessation_date}${r.cessation_reason ? ` (${r.cessation_reason})` : ''}`} />}
        {r.exofficio_strike_start && (
          <Field label="Administrative deregistration" value={`${r.exofficio_strike_start}${r.exofficio_strike_end ? ` – ${r.exofficio_strike_end}` : " (ongoing)"}${r.exofficio_strike_reason ? ` · ${r.exofficio_strike_reason}` : ''}`} />
        )}
        {r.address_strike_date && <Field label="Address deregistration" value={`${r.address_strike_date}${r.address_strike_reason ? ` · ${r.address_strike_reason}` : ''}`} />}
      </dl>
      <div className="address-comparison">
        <div>
          <div className="text-xs text-gray-500">KBO address</div>
          <div className="text-sm">{onbekend(kbo)}</div>
        </div>
        <div className={differs ? 'address-differs' : undefined}>
          <div className="text-xs text-gray-500">Address Register address</div>
          <div className="text-sm">{onbekend(ar)}</div>
        </div>
      </div>
      {differs && <p className="text-xs text-amber-800">Address differs from the Address Register: review required.</p>}
      {(r.nace_rsz || r.nace_vat) && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {r.nace_rsz && <Field label="NACE (social security)" value={`${r.nace_rsz} – ${r.nace_rsz_desc ?? ''}`} />}
          {r.nace_vat && <Field label="NACE (VAT)" value={`${r.nace_vat} – ${r.nace_vat_desc ?? ''}`} />}
        </dl>
      )}
    </div>
  )
}

function Contact({ d }: { d: RecordDetail }) {
  const own = d.record
  const ownLabel = own.record_type === 'establishment' ? "establishment" : "registered office"
  const rows: { label: string; kind: string; value: string; href: string }[] = []
  if (own.phone) rows.push({ label: "Phone", kind: ownLabel, value: own.phone, href: `tel:${own.phone}` })
  if (own.email) rows.push({ label: "Email", kind: ownLabel, value: own.email, href: `mailto:${own.email}` })
  if (d.parent?.phone) rows.push({ label: "Phone", kind: "registered office", value: d.parent.phone, href: `tel:${d.parent.phone}` })
  if (d.parent?.email) rows.push({ label: "Email", kind: "registered office", value: d.parent.email, href: `mailto:${d.parent.email}` })
  if (rows.length === 0) return <p className="text-sm text-gray-600">Contact details unknown</p>
  return (
    <ul className="space-y-1 text-sm">
      {rows.map((c, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-xs text-gray-500">{c.label}</span>
          <a href={c.href} className="text-blue-700 hover:underline">{c.value}</a>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{c.kind}</span>
          <span className="text-xs text-gray-400">source: KBO, retrieved {own.fetched_at?.slice(0, 10)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Detail() {
  const { nr } = useParams<{ nr: string }>()
  const [data, setData] = useState<RecordDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!nr) return
    let cancelled = false
    setError(null)
    getRecord(nr)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error && e.message === 'Not Found' ? "Record not found" : "Could not load data")
      })
    return () => {
      cancelled = true
    }
  }, [nr, tick])

  if (!nr) return <p className="text-sm text-red-700">No registry number provided.</p>
  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>

  const r = data.record
  const a = r.assessment
  return (
    <div className="record-layout">
      <div className="record-content">
        <header className="record-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{r.display_name || dash(r.name)}</h1>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-mono">{r.nr}</span> · {dash(r.address)}
            {r.trade_name && r.trade_name !== r.display_name && <span> · trade name: {r.trade_name}</span>}
          </p>
          {r.kbo_street && (
            <Link to={`/straat/${encodeURIComponent(r.kbo_street)}`} className="text-xs text-blue-700 underline">
              View {r.kbo_street} in the street overview
            </Link>
          )}
        </header>

        <Section title="Assessment">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} label={a.status_label} />
            <span className="text-xs text-gray-500">Confidence score: <ConfidenceScore /></span>
            <span className="text-xs text-gray-500">Register: {dash(a.register_label)}</span>
            {a.last_observed && <span className="text-xs text-gray-500">Last observation: {a.last_observed}</span>}
          </div>
          <p className="mb-3 text-sm"><span className="text-gray-500">Proposal:</span> <span className="font-medium">{a.proposal_text}</span></p>
          <h3 className="mb-1 text-sm font-medium text-gray-800">Why?</h3>
          <ReasonsList reasons={a.reasons} />
        </Section>

        <Section title="Register details"><RegisterFacts r={r} /></Section>
        <Section title="Enterprise ↔ establishment"><LinkageCard detail={data} onChanged={reload} /></Section>
        <Section title="Contact"><Contact d={data} /></Section>

        <Section title="Activity evidence">
          <EvidenceForm nr={r.nr} onSaved={reload} />
          <div className="mt-4 border-t pt-3">
            {data.evidence.length === 0 ? (
              <p className="text-sm text-gray-500">No observations recorded yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.evidence.map((ev) => (
                  <li key={ev.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{ev.observed_at}</span>
                      <span>· {SOURCE_LABELS[ev.source] ?? ev.source}</span>
                      <span className={`rounded px-1.5 py-0.5 ${ev.conclusion === 'actief' ? 'bg-green-100 text-green-800' : ev.conclusion === 'niet_actief' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {CONCLUSION_LABELS[ev.conclusion] ?? ev.conclusion}
                      </span>
                      {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">source ↗</a>}
                    </div>
                    <p className="text-gray-800">{ev.observation}</p>
                    {ev.observed_activity && <p className="text-xs text-gray-600">Activity: {ev.observed_activity}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Proposals"><ProposalList proposals={data.proposals} onChanged={reload} /></Section>
      </div>

      <div className="record-sources">
        <div>
          <EvidencePanel nr={r.nr} links={data.links} record={r} />
        </div>
      </div>
    </div>
  )
}
