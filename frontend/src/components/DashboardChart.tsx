import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_CODES, activitySectorLabel, statusLabel } from '../api'
import type { DashboardData, DashboardScope } from '../dashboard'
import { number, percentage, scopeLink } from '../dashboard'
import { useLang, useT } from '../i18n'
import { MARKER_COLOURS } from './BusinessMap'

const PALETTE = ['#bd1539', '#e97438', '#73374c', '#dd5680', '#9f8fb4', '#c89d67']

export default function DashboardChart({ data, scope }: { data: DashboardData; scope: DashboardScope }) {
  const t = useT()
  const { lang } = useLang()
  const [mode, setMode] = useState<'activities' | 'status'>('status')
  const segments = mode === 'status' ? STATUS_CODES.map((status) => ({
    key: status, label: statusLabel(lang, status), count: data.statuses[status], color: MARKER_COLOURS[status],
    to: scopeLink('/zoeken', scope, { status }),
  })) : data.sectors.map((sector, i) => ({
    key: sector.sector, label: activitySectorLabel(lang, sector.sector, sector.label), count: sector.count,
    color: sector.sector === 'onbekend' ? '#8a7895' : PALETTE[i % PALETTE.length],
    to: scopeLink('/zoeken', scope, { activity: sector.sector }),
  }))
  const legend = [...segments].sort((a, b) => Number(b.key === 'onbekend') - Number(a.key === 'onbekend'))
  const unknown = data.sectors.find((s) => s.sector === 'onbekend')?.count || 0
  const circumference = 2 * Math.PI * 72
  return (
    <section className="dash-panel dash-distribution">
      <div className="dash-panel-heading">
        <h2>{t('dashboard.distribution')}</h2>
        <div className="dash-tabs" role="group" aria-label={t('dashboard.distribution')}>
          {(['status', 'activities'] as const).map((tab) => <button key={tab} type="button" aria-pressed={mode === tab}
            onClick={() => setMode(tab)}>{t(`dashboard.${tab}`)}</button>)}
        </div>
      </div>
      <div className="dash-chart-body">
        <div className="dash-donut">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="72" fill="none" stroke="#efedf0" strokeWidth="22" />
            {segments.map((segment, i) => {
              const length = data.total ? segment.count / data.total * circumference : 0
              const offset = data.total ? segments.slice(0, i).reduce((n, s) => n + s.count, 0) / data.total * circumference : 0
              return length > 0 && <circle key={segment.key} cx="90" cy="90" r="72" fill="none" stroke={segment.color}
                strokeWidth="22" strokeDasharray={`${length - (segments.filter((s) => s.count > 0).length > 1 ? Math.min(1.5, length * .08) : 0)} ${circumference}`}
                strokeDashoffset={-offset} transform="rotate(-90 90 90)" />
            })}
          </svg>
          <div className="dash-donut-center"><strong>{number(data.total)}</strong><span>{t('dashboard.recordsUnit')}</span></div>
        </div>
        <ul className="dash-chart-legend">
          {legend.map((segment) => <li key={segment.key}><Link to={segment.to}>
            <span className="dash-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{number(segment.count)}<small>{percentage(segment.count, data.total)}</small></strong>
          </Link></li>)}
        </ul>
      </div>
      <p className="dash-note">{mode === 'activities' && unknown > 0 ? t('dashboard.unknownActivity', { n: number(unknown), pct: percentage(unknown, data.total) }) : t(mode === 'activities' ? 'dashboard.sectorNote' : 'dashboard.statusNote')}</p>
    </section>
  )
}
