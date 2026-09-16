import { Link } from 'react-router-dom'
import { certaintyLabel, contactStatusLabel, proposalStatusLabel } from '../api'
import type { Certainty, ContactStatus, ProposalStatus } from '../api'
import type { DashboardData, DashboardScope } from '../dashboard'
import { number, percentage, scopeLink, share } from '../dashboard'
import { useLang, useT } from '../i18n'

export default function DashboardCoverage({ data, scope }: { data: DashboardData; scope: DashboardScope }) {
  const t = useT()
  const { lang } = useLang()
  return <section className="dash-coverage">
    <div className="dash-section-heading"><div><h2>{t('dashboard.quality')}</h2><p className="dash-note">{t('dashboard.qualityIntro')}</p></div></div>
    <div className="dash-coverage-grid">
      <section className="dash-panel">
        <h2>{t('dashboard.evidence')}</h2>
        <Link className="dash-coverage-value" to={scopeLink('/zoeken', scope, { has_evidence: true })}>
          {number(data.with_evidence)} <span>{percentage(data.with_evidence, data.total)}</span><span aria-hidden="true">↗</span>
        </Link>
        <div className="dash-track" aria-hidden="true"><span style={{ width: `${share(data.with_evidence, data.total)}%`, background: '#871f40' }} /></div>
        <p className="dash-note mt-3">{t('dashboard.evidenceNote')}</p>
        <Link className="dash-text-link mt-3" to={scopeLink('/zoeken', scope, { has_evidence: false })}>{t('dashboard.noEvidence')} <strong>{number(data.total - data.with_evidence)}</strong> <span aria-hidden="true">↗</span></Link>
      </section>
      <section className="dash-panel">
        <h2>{t('dashboard.contact')}</h2>
        <ul className="dash-metric-list">
          {(['register', 'zetel', 'waargenomen', 'onbekend'] as ContactStatus[]).map((contact) => <li key={contact}>
            <Link to={scopeLink('/zoeken', scope, { contact })}><span>{contact === 'onbekend' ? t('common.unknown') : contactStatusLabel(lang, contact)}</span><strong>{number(data.contacts[contact])}<small>{percentage(data.contacts[contact], data.total)}</small></strong></Link>
          </li>)}
        </ul>
        <p className="dash-note">{t('dashboard.contactNote')}</p>
      </section>
      <section className="dash-panel">
        <h2>{t('dashboard.certainty')}</h2>
        <ul className="dash-metric-list">
          {(['hoog', 'middel', 'laag'] as Certainty[]).map((certainty) => <li key={certainty}>
            <Link to={scopeLink('/zoeken', scope, { certainty })}><span>{certaintyLabel(lang, certainty)}</span><strong>{number(data.certainty[certainty])}<small>{percentage(data.certainty[certainty], data.total)}</small></strong></Link>
          </li>)}
        </ul>
        <div className="dash-parent-note"><Link className="dash-text-link" to={scopeLink('/zoeken', scope, { parent_missing: true })}>{t('dashboard.parents')} <strong>{number(data.missing_parents)}</strong> <span aria-hidden="true">↗</span></Link>
          <p className="dash-note">{t('dashboard.parentsNote', { pct: percentage(data.missing_parents, data.types.establishment), n: number(data.types.establishment) })}</p>
        </div>
      </section>
    </div>
    <section className="dash-panel dash-proposals">
      <div><h2>{t('dashboard.proposals')}</h2><p className="dash-note">{t('dashboard.proposalsNote')}</p></div>
      <div className="dash-proposal-counts">
        {(['open', 'bevestigd', 'afgewezen'] as ProposalStatus[]).map((status) => <Link key={status} to={scopeLink('/goedgekeurd', scope, { status })}>
          <strong>{number(data.proposals[status])}</strong><span>{proposalStatusLabel(lang, status)} <span aria-hidden="true">↗</span></span>
        </Link>)}
      </div>
      <Link className="dash-unlinked" to="/goedgekeurd?linked=false&status=all">{t('dashboard.unlinked', { n: number(data.unlinked_proposals_all_municipalities) })} <span aria-hidden="true">↗</span></Link>
    </section>
  </section>
}
