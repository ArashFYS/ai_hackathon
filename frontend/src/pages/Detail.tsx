import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Indicators, KboPublic, RecordDetail, RecordFull } from '../api'
import { activitySectorLabel, activitySourceLabel, conclusionLabel, dash, getIndicators, getRecord, onbekend, proposalTextLabel, recordTypeLabel, registerLabel, sourceLabel, refreshKboPublic } from '../api'
import type { Lang, TKey } from '../i18n'
import { useLang, useT } from '../i18n'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import ReasonsList from '../components/ReasonsList'
import LinkageCard from '../components/LinkageCard'
import EvidenceForm from '../components/EvidenceForm'
import ProposalList from '../components/ProposalList'
import EvidencePanel from '../components/EvidencePanel'
import ContactBlock from '../components/ContactBlock'
import IndicatorLights from '../components/IndicatorLights'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const { lang } = useLang()
  return (
    <div className="fact-row">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800">{onbekend(lang, value)}</dd>
    </div>
  )
}

function fmtAddr(street: string | null, nr: string | null, box: string | null, pc: string | null, mun: string | null): string | null {
  if (!street && !nr) return null
  const line = [street, nr, box ? `bus ${box}` : null].filter(Boolean).join(' ')
  const tail = [pc, mun].filter(Boolean).join(' ')
  return tail ? `${line}, ${tail}` : line
}

/** Register values (rechtsvorm, rechtstoestand, reasons for strike-off) are KBO text as delivered. */
function RegisterFacts({ r, lang }: { r: RecordFull; lang: Lang }) {
  const t = useT()
  const f = (k: TKey) => t(k)
  const kbo = fmtAddr(r.kbo_street, r.kbo_housenr, r.kbo_box, r.kbo_postcode, r.kbo_municipality)
  const ar = fmtAddr(r.ar_street, r.ar_housenr, r.ar_box, r.ar_postcode, r.kbo_municipality)
  const bothSet = Boolean(r.kbo_street && r.ar_street)
  const differs = bothSet && (r.kbo_street !== r.ar_street || (r.kbo_housenr ?? '') !== (r.ar_housenr ?? ''))
  return (
    <div className="space-y-3">
      <dl className="register-fields">
        <Field label={f('detail.field.legalForm')} value={r.legal_form} />
        <Field label={f('detail.field.legalStatus')} value={r.legal_status} />
        <Field label={f('detail.field.type')} value={r.entity_type ?? recordTypeLabel(lang, r.record_type)} />
        <Field label={f('detail.field.startDate')} value={r.start_date} />
        <Field label={f('detail.field.registration')} value={r.registration_date} />
        <Field label={f('detail.field.staffClass')} value={r.staff_class} />
        {r.cessation_date && <Field label={f('detail.field.cessation')} value={`${r.cessation_date}${r.cessation_reason ? ` (${r.cessation_reason})` : ''}`} />}
        {r.exofficio_strike_start && (
          <Field label={f('detail.field.exofficio')} value={`${r.exofficio_strike_start}${r.exofficio_strike_end ? ` – ${r.exofficio_strike_end}` : ` ${f('detail.field.ongoing')}`}${r.exofficio_strike_reason ? ` · ${r.exofficio_strike_reason}` : ''}`} />
        )}
        {r.address_strike_date && <Field label={f('detail.field.addressStrike')} value={`${r.address_strike_date}${r.address_strike_reason ? ` · ${r.address_strike_reason}` : ''}`} />}
      </dl>
      <div className="address-comparison">
        <div>
          <div className="text-xs text-gray-500">{f('detail.field.kboAddress')}</div>
          <div className="text-sm">{onbekend(lang, kbo)}</div>
        </div>
        <div className={differs ? 'address-differs' : undefined}>
          <div className="text-xs text-gray-500">{f('detail.field.arAddress')}</div>
          <div className="text-sm">{onbekend(lang, ar)}</div>
        </div>
      </div>
      {differs && <p className="text-xs text-amber-800">{f('detail.field.addressDiffers')}</p>}
      <ActivityFacts r={r} lang={lang} />
    </div>
  )
}

/** Every NACEBEL 2025 activity from the KBO Public Search page, with a refresh button (TICKET-035). */
function NacebelActivities({ nr, kboPublic, onChanged }: { nr: string; kboPublic: KboPublic | null; onChanged: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const acts = kboPublic?.activities ?? []
  const refresh = async () => {
    setBusy(true)
    setErr(null)
    try {
      const p = await refreshKboPublic(nr)
      if (!p.available) setErr(p.note ?? t('nacebel.error'))
      onChanged()
    } catch {
      setErr(t('nacebel.error'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-500">
          {kboPublic?.snapshot_date ? t('nacebel.checked', { date: kboPublic.snapshot_date }) : t('nacebel.notChecked')}
          {kboPublic?.status ? ` · ${t('nacebel.status')}: ${kboPublic.status}` : ''}
        </span>
        <button type="button" onClick={refresh} disabled={busy} className="rounded border border-gray-400 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50">
          {busy ? t('common.loading') : t('nacebel.refresh')}
        </button>
        {kboPublic?.url && (
          <a href={kboPublic.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline">{t('common.sourceLink')}</a>
        )}
      </div>
      {err && <p className="text-xs text-red-700">{err}</p>}
      {acts.length > 0 ? (
        <ul className="divide-y text-sm">
          {acts.map((a, i) => (
            <li key={`${a.code}-${i}`} className="flex flex-wrap items-baseline gap-2 py-1">
              <span className={`rounded px-1.5 py-0.5 text-xs ${a.kind === 'hoofd' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>{t(`nacebel.kind.${a.kind}`)}</span>
              <span className="font-mono text-xs text-gray-600">{a.code}</span>
              <span>{a.title ?? '—'}</span>
              {a.since && <span className="text-xs text-gray-500">{t('nacebel.since', { date: a.since })}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">{kboPublic ? t('nacebel.none') : t('nacebel.hint')}</p>
      )}
    </div>
  )
}

function ActivityFacts({ r, lang }: { r: RecordFull; lang: Lang }) {
  const t = useT()
  const a = r.activity
  return (
    <dl className="register-fields activity-fields">
      <Field label={t('detail.field.activity')} value={a?.sector === 'onbekend' ? null : activitySectorLabel(lang, a?.sector, a?.label)} />
      <Field
        label={a?.source === 'waarneming' ? t('detail.field.observedActivity') : t('detail.field.nace')}
        value={a?.nace ? (a.source === 'waarneming' ? a.description : `${a.nace}${a.description ? ` – ${a.description}` : ''}`) : null}
      />
      <Field label={t('detail.field.activitySource')} value={activitySourceLabel(lang, a?.source)} />
    </dl>
  )
}

export default function Detail() {
  const t = useT()
  const { lang } = useLang()
  const { nr } = useParams<{ nr: string }>()
  const [data, setData] = useState<RecordDetail | null>(null)
  const [error, setError] = useState<'notFound' | 'load' | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((x) => x + 1), [])
  const [live, setLive] = useState<Indicators | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // Live Peppol lookup (cached server-side); failures keep the cached dots.
    if (!nr) return
    let cancelled = false
    setLive(null)
    setChecking(true)
    getIndicators(nr)
      .then((ind) => {
        if (!cancelled) setLive(ind)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [nr])

  useEffect(() => {
    if (!nr) return
    let cancelled = false
    setError(null)
    getRecord(nr)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error && e.message === 'Not Found' ? 'notFound' : 'load')
      })
    return () => {
      cancelled = true
    }
  }, [nr, tick])

  if (!nr) return <p className="text-sm text-red-700">{t('detail.noNr')}</p>
  if (error) return <p className="text-sm text-red-700">{error === 'notFound' ? t('detail.notFound') : t('common.loadError')}</p>
  if (!data) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  const r = data.record
  const a = r.assessment
  return (
    <div className="record-layout">
      <div className="record-content">
        <header className="record-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{r.display_name || dash(r.name)}</h1>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{recordTypeLabel(lang, r.record_type)}</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-mono">{r.nr}</span> · {dash(r.address)}
            {r.trade_name && r.trade_name !== r.display_name && <span> · {t('detail.tradeName')} {r.trade_name}</span>}
          </p>
          {r.kbo_street && (
            <Link to={`/straat/${encodeURIComponent(r.kbo_street)}`} className="text-xs text-blue-700 underline">
              {t('detail.viewStreet', { street: r.kbo_street })}
            </Link>
          )}
        </header>

        {/* Reason sentences and proposal_text are generated by the backend in Dutch; EN shows them unchanged with a note. */}
        <Section title={t('detail.assessment')}>
          <dl className="assessment-facts">
            <div><dt>{t('col.status')}</dt><dd><StatusBadge status={a.status} label={a.status_label} /></dd></div>
            <div><dt>{t('col.certainty')}</dt><dd><ZekerheidBadge certainty={a.certainty} label={a.certainty_label} /></dd></div>
            <div><dt>{t('col.register')}</dt><dd>{registerLabel(lang, a.register_label)}</dd></div>
          </dl>
          {a.last_observed && <p className="text-xs text-gray-500">{t('detail.lastObserved')} {a.last_observed}</p>}
          <p className="assessment-proposal"><span>{t('detail.proposal')}</span> <strong>{proposalTextLabel(lang, a.proposal_text)}</strong></p>
          {lang === 'en' && <p className="source-language-note">{t('detail.sourceTextNote')}</p>}
          <h3 className="mb-1 text-sm font-medium text-gray-800">{t('indicators.title')}{checking && <span className="ml-2 text-xs font-normal text-gray-500">{t('indicators.checking')}</span>}</h3>
          <div className="mb-3"><IndicatorLights indicators={live ?? r.indicators} detailed /></div>

          <h3 className="mb-1 text-sm font-medium text-gray-800">{t('detail.why')}</h3>
          <ReasonsList reasons={a.reasons} />
        </Section>

        <Section title={t('detail.registerData')}><RegisterFacts r={r} lang={lang} /><div className="mt-3"><NacebelActivities nr={r.nr} kboPublic={data.kbo_public} onChanged={reload} /></div></Section>
        <Section title={t('detail.linkage')}><LinkageCard detail={data} onChanged={reload} /></Section>
        <Section title={t('detail.contact')}><ContactBlock contacts={data.contacts} status={data.contact_status} /></Section>

        <Section title={t('detail.evidence')}>
          <EvidenceForm nr={r.nr} onSaved={reload} />
          <div className="evidence-history">
            {data.evidence.length === 0 ? (
              <p className="text-sm text-gray-500">{t('detail.noEvidence')}</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.evidence.map((ev) => (
                  <li key={ev.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{ev.observed_at}</span>
                      <span>· {sourceLabel(lang, ev.source)}</span>
                      <span className={`rounded px-1.5 py-0.5 ${ev.conclusion === 'actief' ? 'bg-green-100 text-green-800' : ev.conclusion === 'niet_actief' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {conclusionLabel(lang, ev.conclusion)}
                      </span>
                      {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t('common.sourceLink')}</a>}
                    </div>
                    <p className="text-gray-800">{ev.observation}</p>
                    {ev.observed_activity && <p className="text-xs text-gray-600">{t('detail.activityLine')} {ev.observed_activity}</p>}
                    {(ev.phone || ev.email || ev.website) && (
                      <p className="text-xs text-gray-600">{t('detail.contactSeen')} {[ev.phone, ev.email, ev.website].filter(Boolean).join(' · ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title={t('detail.proposals')}><ProposalList proposals={data.proposals} onChanged={reload} /></Section>
      </div>

      <div className="record-sources">
        <div>
          <EvidencePanel key={r.nr} nr={r.nr} links={data.links} record={r} />
        </div>
      </div>
    </div>
  )
}
