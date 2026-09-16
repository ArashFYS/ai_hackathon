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
    { label: t('dashboard.records'), value: data.total, color: '#bd1539', filter: {}, caption: t('dashboard.uniqueRecords') },
    { label: t('dashboard.enterprises'), value: data.types.enterprise, color: '#73374c', filter: { type: 'enterprise' }, caption: t('dashboard.ofSelection', { pct: percentage(data.types.enterprise, data.total) }) },
    { label: t('dashboard.establishments'), value: data.types.establishment, color: '#e97438', filter: { type: 'establishment' }, caption: t('dashboard.ofSelection', { pct: percentage(data.types.establishment, data.total) }) },
    { label: t('dashboard.review'), value: data.statuses.ter_controle, color: '#d58a13', filter: { status: 'ter_controle' }, caption: t('dashboard.ofSelection', { pct: percentage(data.statuses.ter_controle, data.total) }) },
  ] : []

  return <div className="dashboard-page">
    <section className="dash-hero">
      <div><p className="dash-eyebrow">{t('dashboard.eyebrow')}</p><h1>{t('dashboard.title')}</h1><p className="dash-hero-intro">{t('dashboard.intro')}</p></div>
      <label className="dash-municipality"><span>{t('dashboard.municipality')}</span>
        <select value={municipalityValue} onChange={(e) => update({ gemeente: e.target.value, sector: '', soort: '' })} aria-describedby="municipality-note">
          {!municipalities.some((m) => m.code === municipalityValue) && <option value={municipalityValue}>{name}</option>}
          {municipalities.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
        </select><small id="municipality-note">{t('dashboard.available')}</small>
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
      <div className="dash-dataset-note"><span className="dash-dataset-tag">{t('dashboard.partial')}</span><span>{t(data.provenance.complete_municipality === false ? 'dashboard.partialNote' : 'dashboard.coverageUnknown')}</span><a href="#dashboard-source">{t('dashboard.sourceTitle')} <span aria-hidden="true">↓</span></a></div>
      {data.total === 0 && <div className="dash-panel dash-empty" role="status"><h2>{t('dashboard.empty')}</h2><p>{t('dashboard.emptyHint')}</p></div>}
      <div className="dash-overview-grid">
        <section className="dash-kpis"><div className="dash-section-heading"><h2>{t('dashboard.kpis')}</h2><span className="dash-note">{name}</span></div>
          <div className="dash-kpi-grid">{cards.map((card) => {
            const selectable = !type || !card.filter.type || card.filter.type === type
            const content = <>
              <div className="dash-kpi-top"><span className="dash-dot" style={{ background: card.color }} />{selectable && <span aria-hidden="true">↗</span>}</div>
              <strong className="dash-kpi-number">{number(card.value)}</strong><h3>{card.label}</h3><p>{card.caption}</p>
              <div className="dash-track" aria-hidden="true"><span style={{ width: `${share(card.value, data.total)}%`, background: card.color }} /></div>
              <span className="dash-kpi-action">{t(selectable ? 'dashboard.viewRecords' : 'dashboard.excluded')}{selectable && <span aria-hidden="true"> →</span>}</span>
            </>
            return selectable ? <Link key={card.label} className="dash-kpi" to={scopeLink('/zoeken', scope, card.filter)}>{content}</Link>
              : <div key={card.label} className="dash-kpi is-unavailable">{content}</div>
          })}</div>
        </section>
        <DashboardChart data={data} scope={scope} />
      </div>
      <div className="dash-detail-grid">
        <section className="dash-panel dash-map-panel"><div className="dash-panel-heading"><div><h2>{t('dashboard.mapTitle', { municipality: name })}</h2><p className="dash-note">{t('dashboard.mapCoverage', { n: number(data.map.length), total: number(data.total) })}</p></div><Link className="dash-text-link" to={scopeLink('/kaart', scope)}>{t('dashboard.openMap')} <span aria-hidden="true">↗</span></Link></div>
          {data.map.length ? <div className="dash-map"><BusinessMap items={data.map} className="h-full w-full" compact /></div> : <div className="dash-map dash-empty">{t('dashboard.noCoordinates')}</div>}
          <div className="dash-map-footer"><div>{STATUS_CODES.map((status) => <span key={status}><i className="dash-dot" style={{ background: MARKER_COLOURS[status] }} />{statusLabel(lang, status)}</span>)}</div><span>{t('dashboard.mapOutside', { n: number(data.map.filter((p) => p.outside_municipality).length) })}</span></div>
        </section>
        <section className="dash-panel dash-status-panel"><h2>{t('dashboard.statusTitle')}</h2><p className="dash-note">{t('dashboard.statusNote')}</p>
          <ul className="dash-status-bars">{STATUS_CODES.map((status) => <li key={status}><Link to={scopeLink('/zoeken', scope, { status })}>
            <div><span>{statusLabel(lang, status)}</span><strong>{number(data.statuses[status])}<small>{percentage(data.statuses[status], data.total)}</small></strong></div>
            <div className="dash-track" aria-hidden="true"><span style={{ width: `${share(data.statuses[status], data.total)}%`, background: MARKER_COLOURS[status] }} /></div>
          </Link></li>)}</ul>
          <Link className="dash-primary" to={scopeLink('/zoeken', scope, { status: 'ter_controle' })}>{t('dashboard.attention')} <span aria-hidden="true">→</span></Link>
          <p className="dash-note mt-3">{t('dashboard.noEvidenceWarning')}</p>
        </section>
      </div>
      <DashboardCoverage data={data} scope={scope} />
      <details id="dashboard-source" className="dash-source"><summary>{t('dashboard.sourceTitle')}<span>{data.provenance.retrieved_from ? t('dashboard.retrieved', { date: data.provenance.retrieved_from + (data.provenance.retrieved_to !== data.provenance.retrieved_from ? ` – ${data.provenance.retrieved_to}` : '') }) : t('dashboard.unknownDate')}</span></summary><div><p>{t('dashboard.source')}</p><p>{t('dashboard.snapshot')}</p><p>{t('dashboard.definition')}</p></div></details>
    </>}
  </div>
}
