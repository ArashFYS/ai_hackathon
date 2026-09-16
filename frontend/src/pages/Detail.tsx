import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { RecordDetail, RecordFull } from '../api'
import { CONCLUSION_LABELS, RECORD_TYPE_LABELS, SOURCE_LABELS, dash, getRecord, onbekend } from '../api'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import ReasonsList from '../components/ReasonsList'
import LinkageCard from '../components/LinkageCard'
import EvidenceForm from '../components/EvidenceForm'
import ProposalList from '../components/ProposalList'
import EvidencePanel from '../components/EvidencePanel'
import ContactBlock from '../components/ContactBlock'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
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
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field label="Rechtsvorm" value={r.legal_form} />
        <Field label="Rechtstoestand" value={r.legal_status} />
        <Field label="Type" value={r.entity_type ?? RECORD_TYPE_LABELS[r.record_type]} />
        <Field label="Startdatum" value={r.start_date} />
        <Field label="Inschrijving" value={r.registration_date} />
        <Field label="Personeelsklasse" value={r.staff_class} />
        {r.cessation_date && <Field label="Stopzetting" value={`${r.cessation_date}${r.cessation_reason ? ` (${r.cessation_reason})` : ''}`} />}
        {r.exofficio_strike_start && (
          <Field label="Ambtshalve doorhaling" value={`${r.exofficio_strike_start}${r.exofficio_strike_end ? ` – ${r.exofficio_strike_end}` : ' (lopend)'}${r.exofficio_strike_reason ? ` · ${r.exofficio_strike_reason}` : ''}`} />
        )}
        {r.address_strike_date && <Field label="Adresdoorhaling" value={`${r.address_strike_date}${r.address_strike_reason ? ` · ${r.address_strike_reason}` : ''}`} />}
      </dl>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded border bg-gray-50 p-2">
          <div className="text-xs text-gray-500">KBO-adres</div>
          <div className="text-sm">{onbekend(kbo)}</div>
        </div>
        <div className={`rounded border p-2 ${differs ? 'border-amber-400 bg-amber-50' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-500">Adressenregister-adres</div>
          <div className="text-sm">{onbekend(ar)}</div>
        </div>
      </div>
      {differs && <p className="text-xs text-amber-800">Adres wijkt af van het Adressenregister: nazien.</p>}
      <ActivityFacts r={r} />
    </div>
  )
}

function ActivityFacts({ r }: { r: RecordFull }) {
  const a = r.activity
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Field label="Activiteit" value={a?.sector === 'onbekend' ? null : a?.label} />
      <Field
        label={a?.source === 'waarneming' ? 'Waargenomen activiteit' : 'NACE-code'}
        value={a?.nace ? (a.source === 'waarneming' ? a.description : `${a.nace}${a.description ? ` – ${a.description}` : ''}`) : null}
      />
      <Field label="Bron activiteit" value={a?.source} />
    </dl>
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
        if (!cancelled) setError(e instanceof Error && e.message === 'Not Found' ? 'Record niet gevonden' : 'Kon gegevens niet laden')
      })
    return () => {
      cancelled = true
    }
  }, [nr, tick])

  if (!nr) return <p className="text-sm text-red-700">Geen ondernemingsnummer opgegeven.</p>
  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!data) return <p className="text-sm text-gray-500">Laden…</p>

  const r = data.record
  const a = r.assessment
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <header className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{r.display_name || dash(r.name)}</h1>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-mono">{r.nr}</span> · {dash(r.address)}
            {r.trade_name && r.trade_name !== r.display_name && <span> · handelsnaam: {r.trade_name}</span>}
          </p>
          {r.kbo_street && (
            <Link to={`/straat/${encodeURIComponent(r.kbo_street)}`} className="text-xs text-blue-700 underline">
              Bekijk {r.kbo_street} in het Straatoverzicht
            </Link>
          )}
        </header>

        <Section title="Beoordeling">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} label={a.status_label} />
            <ZekerheidBadge certainty={a.certainty} label={a.certainty_label} />
            <span className="text-xs text-gray-500">Register: {dash(a.register_label)}</span>
            {a.last_observed && <span className="text-xs text-gray-500">Laatste waarneming: {a.last_observed}</span>}
          </div>
          <p className="mb-3 text-sm"><span className="text-gray-500">Voorstel:</span> <span className="font-medium">{a.proposal_text}</span></p>
          <h3 className="mb-1 text-sm font-medium text-gray-800">Waarom?</h3>
          <ReasonsList reasons={a.reasons} />
        </Section>

        <Section title="Registergegevens"><RegisterFacts r={r} /></Section>
        <Section title="Onderneming ↔ vestiging"><LinkageCard detail={data} onChanged={reload} /></Section>
        <Section title="Contact"><ContactBlock contacts={data.contacts} status={data.contact_status} /></Section>

        <Section title="Bewijs van activiteit">
          <EvidenceForm nr={r.nr} onSaved={reload} />
          <div className="mt-4 border-t pt-3">
            {data.evidence.length === 0 ? (
              <p className="text-sm text-gray-500">Nog geen waarnemingen gelogd.</p>
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
                      {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">bron ↗</a>}
                    </div>
                    <p className="text-gray-800">{ev.observation}</p>
                    {ev.observed_activity && <p className="text-xs text-gray-600">Activiteit: {ev.observed_activity}</p>}
                    {(ev.phone || ev.email || ev.website) && (
                      <p className="text-xs text-gray-600">Contact gezien: {[ev.phone, ev.email, ev.website].filter(Boolean).join(' · ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Voorstellen"><ProposalList proposals={data.proposals} onChanged={reload} /></Section>
      </div>

      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-4">
          <EvidencePanel nr={r.nr} links={data.links} />
        </div>
      </div>
    </div>
  )
}
