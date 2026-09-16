import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { STATUS_CODES, activitySectorLabel, statusLabel } from '../api'
import type { RecordType, RecordsQuery } from '../api'
import { getDashboard, number, percentage, scopeLink, share } from '../dashboard'
import type { DashboardData, DashboardScope } from '../dashboard'
import { useLang, useT } from '../i18n'
import BusinessMap, { MARKER_COLOURS } from '../components/BusinessMap'
import DashboardChart from '../components/DashboardChart'
import DashboardCoverage from '../components/DashboardCoverage'
import DashboardValue from '../components/DashboardValue'

export default function Dashboard() {
  const t = useT()
  const { lang } = useLang()
  const [params, setParams] = useSearchParams()
  const municipality = params.get('gemeente') || 'Schoten'
  const type = (params.get('soort') || '') as RecordType | ''
  const activity = params.get('sector') || ''
  const [revision, setRevision] = useState(0)
  const requestKey = JSON.stringify([municipality, type, activity, revision])
  const [result, setResult] = useState<{ key: string; data?: DashboardData; error?: boolean } | null>(null)
  const [options, setOptions] = useState<DashboardData | null>(null)
  const data = result?.key === requestKey ? result.data : undefined
  const error = result?.key === requestKey && result.error
  const loading = !data && !error
  const scope: DashboardScope = { municipality, type, activity }

  useEffect(() => {
    let cancelled = false
    getDashboard({ municipality, type, activity }).then((next) => {
      if (!cancelled) { setResult({ key: requestKey, data: next }); setOptions(next) }
    }).catch(() => { if (!cancelled) setResult({ key: requestKey, error: true }) })
    return () => { cancelled = true }
  }, [municipality, type, activity, requestKey])

  useEffect(() => {
    const refresh = () => { if (!document.hidden) setRevision((v) => v + 1) }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  function update(next: Record<string, string>) {
    const updated = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value)
      else updated.delete(key)
    }
    setParams(updated)
  }

  const municipalities = options?.municipalities ?? []
  const name = data?.scope.name || municipalities.find((m) => municipality === m.code || municipality === m.name)?.name || municipality
  const municipalityValue = municipalities.find((m) => municipality === m.name)?.code || municipality
  const cards: { label: string; value: number; color: string; filter: RecordsQuery; caption: string }[] = data ? [
    { label: t('dashboard.review'), value: data.statuses.ter_controle, color: MARKER_COLOURS.ter_controle, filter: { status: 'ter_controle' }, caption: t('dashboard.reviewMeaning') },
    { label: t('dashboard.activeAssessment'), value: data.statuses.actief, color: MARKER_COLOURS.actief, filter: { status: 'actief' }, caption: t('dashboard.activeMeaning') },
    { label: t('dashboard.evidence'), value: data.with_evidence, color: '#73374c', filter: { has_evidence: true }, caption: t('dashboard.observationMeaning') },
  ] : []
  const gaps = data ? [
    { label: t('dashboard.noEvidence'), value: data.total - data.with_evidence, filter: { has_evidence: false }, color: '#73374c' },
    { label: t('dashboard.activityUnknown'), value: data.sectors.find((s) => s.sector === 'onbekend')?.count || 0, filter: { activity: 'onbekend' }, color: '#8a7895' },
    { label: t('dashboard.contactUnknown'), value: data.contacts.onbekend, filter: { contact: 'onbekend' as const }, color: '#d58a13' },
  ].filter((gap) => !gap.filter.activity || !activity || activity === gap.filter.activity) : []

  return <div className="dashboard-page">
    <section className="dash-hero">
      <div><h1>{t('dashboard.title')}</h1><p className="dash-hero-intro">{t(data && data.total > 0 && data.with_evidence === 0 ? 'dashboard.startReview' : 'dashboard.intro')}</p></div>
      <label className="dash-municipality"><span>{t('dashboard.municipality')}</span>
        <select value={municipalityValue} onChange={(e) => update({ gemeente: e.target.value, sector: '', soort: '' })}>
          {!municipalities.some((m) => m.code === municipalityValue) && <option value={municipalityValue}>{name}</option>}
          {municipalities.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select>
      </label>
    </section>

    <div className="dash-filterbar">
      <span className="dash-filter-label">{t('dashboard.selection')}</span>
      <label><span className="sr-only">{t('search.type')}</span><select value={type} onChange={(e) => update({ soort: e.target.value, sector: '' })}>
        <option value="">{t('dashboard.allRecords')}</option><option value="enterprise">{t('dashboard.enterprises')}</option><option value="establishment">{t('dashboard.establishments')}</option>
      </select></label>
      <label className="dash-sector-filter"><span className="sr-only">{t('activity.label')}</span><select value={activity} onChange={(e) => update({ sector: e.target.value })}>
        <option value="">{t('dashboard.allSectors')}</option>
        {activity && !options?.sector_options.some((s) => s.sector === activity) && <option value={activity}>{activitySectorLabel(lang, activity, activity)}</option>}
        {options?.sector_options.map((s) => <option key={s.sector} value={s.sector}>{activitySectorLabel(lang, s.sector, s.label)} ({number(s.count)})</option>)}
      </select></label>
      {(type || activity) && <button type="button" className="dash-text-link" onClick={() => update({ soort: '', sector: '' })}>{t('dashboard.reset')}</button>}
      <button type="button" className="dash-refresh" onClick={() => setRevision((v) => v + 1)} disabled={loading}><span aria-hidden="true">↻</span> {t('dashboard.refresh')}</button>
    </div>

    {loading && <div role="status" className="dash-loading"><p>{t('common.loading')}</p><div className="dash-skeleton-grid">{[0, 1, 2, 3].map((i) => <div key={i} />)}</div></div>}
    {error && <div role="alert" className="dash-panel dash-empty"><p>{t('dashboard.error')}</p><button type="button" className="dash-primary" onClick={() => setRevision((v) => v + 1)}>{t('dashboard.retry')}</button></div>}
    {data && <>
      <div className="dash-selection-summary">
        <div><Link to={scopeLink('/zoeken', scope)} className="dash-selection-total">{t(type === 'enterprise' ? 'dashboard.selectionEnterprises' : type === 'establishment' ? 'dashboard.selectionEstablishments' : 'dashboard.selectionRecords', { n: number(data.total) })} <span aria-hidden="true">↗</span></Link>
          {!type && <span className="dash-note">{t('dashboard.composition', { enterprises: number(data.types.enterprise), establishments: number(data.types.establishment) })}</span>}
        </div>
        <div className="dash-dataset-note"><span className="dash-dataset-tag">{t(data.provenance.complete_municipality === false ? 'dashboard.partial' : 'dashboard.coverageLabel')}</span><span>{t(data.provenance.complete_municipality === false ? 'dashboard.partialNote' : 'dashboard.coverageUnknown')}</span><a href="#dashboard-source">{t('dashboard.sourceTitle')} <span aria-hidden="true">↓</span></a></div>
      </div>
      {data.total === 0 && <div className="dash-panel dash-empty" role="status"><h2>{t('dashboard.empty')}</h2><p>{t('dashboard.emptyHint')}</p></div>}
      <div className="dash-overview-grid">
        <section className="dash-kpis"><div className="dash-section-heading"><h2>{t('dashboard.priorities')}</h2></div>
          <div className="dash-kpi-grid">{cards.map((card) => <Link key={card.label} className="dash-kpi" to={scopeLink('/zoeken', scope, card.filter)}>
            <div className="dash-kpi-top"><span className="dash-dot" style={{ background: card.color }} /><span aria-hidden="true">↗</span></div>
            <strong className="dash-kpi-number">{number(card.value)}</strong><h3>{card.label}</h3>
            <span className="dash-kpi-share">{t('dashboard.ofSelection', { pct: percentage(card.value, data.total) })}</span><p>{card.caption}</p>
            <div className="dash-track" aria-hidden="true"><span style={{ width: `${share(card.value, data.total)}%`, background: card.color }} /></div>
            <span className="dash-kpi-action">{t('dashboard.viewRecords')}<span aria-hidden="true">→</span></span>
          </Link>)}</div>
          {data.total > 0 && <div className="dash-insight"><strong>{t(data.with_evidence === 0 ? 'dashboard.noObservationsYet' : 'dashboard.assessmentContext')}</strong><p>{t(data.with_evidence === 0 ? 'dashboard.noObservationsMeaning' : 'dashboard.noEvidenceWarning')}</p></div>}
        </section>
        <DashboardChart data={data} scope={scope} />
      </div>
      <div className="dash-detail-grid">
        <section className="dash-panel dash-map-panel"><div className="dash-panel-heading"><div><h2>{t('dashboard.mapTitle', { municipality: name })}</h2><p className="dash-note">{t('dashboard.mapCoverage', { n: number(data.map.length), total: number(data.total) })}</p></div><Link className="dash-text-link" to={scopeLink('/kaart', scope)}>{t('dashboard.openMap')} <span aria-hidden="true">↗</span></Link></div>
          {data.map.length ? <div className="dash-map"><BusinessMap items={data.map} className="h-full w-full" compact /></div> : <div className="dash-map dash-empty">{t('dashboard.noCoordinates')}</div>}
          <div className="dash-map-footer"><div>{STATUS_CODES.map((status) => <span key={status}><i className="dash-dot" style={{ background: MARKER_COLOURS[status] }} />{statusLabel(lang, status)}</span>)}</div><span>{t('dashboard.mapOutside', { n: number(data.map.filter((p) => p.outside_municipality).length) })}</span></div>
        </section>
        <section className="dash-panel dash-status-panel"><h2>{t('dashboard.gapsTitle')}</h2><p className="dash-note">{t('dashboard.gapsNote')}</p>
          <ul className="dash-status-bars">{gaps.map((gap) => <li key={gap.label}><Link to={scopeLink('/zoeken', scope, gap.filter)}>
            <div><span>{gap.label}</span><DashboardValue value={gap.value} total={data.total} /></div>
            <div className="dash-track" aria-hidden="true"><span style={{ width: `${share(gap.value, data.total)}%`, background: gap.color }} /></div>
          </Link></li>)}</ul>
          <Link className="dash-primary" to={scopeLink('/zoeken', scope, { status: 'ter_controle' })}>{t('dashboard.attention')} <span aria-hidden="true">→</span></Link>
        </section>
      </div>
      <DashboardCoverage data={data} scope={scope} />
      <details id="dashboard-source" className="dash-source"><summary>{t('dashboard.sourceTitle')}<span>{data.provenance.retrieved_from ? t('dashboard.retrieved', { date: data.provenance.retrieved_from + (data.provenance.retrieved_to !== data.provenance.retrieved_from ? ` – ${data.provenance.retrieved_to}` : '') }) : t('dashboard.unknownDate')}</span></summary><div><p>{t('dashboard.source')}</p><p>{t('dashboard.snapshot')}</p><p>{t('dashboard.definition')}</p></div></details>
    </>}
  </div>
}
