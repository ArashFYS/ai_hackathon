import { useState } from 'react'
import type { Links } from '../api'
import { useT } from '../i18n'
import NbbPanel from './NbbPanel'

type TabId = 'kaart' | 'streetview' | 'kbo' | 'nbb' | 'inhoudingsplicht' | 'staatsblad' | 'web'

interface Tab {
  id: TabId
  embed: (l: Links) => string | null
  open: (l: Links) => string
}

// Label, source and "what to check" text live in i18n under panel.tab.*, panel.bron.*, panel.check.*.
const TABS: Tab[] = [
  { id: 'kaart', embed: (l) => l.google_maps_embed, open: (l) => l.google_maps },
  { id: 'streetview', embed: (l) => l.street_view_embed, open: (l) => l.street_view },
  { id: 'kbo', embed: (l) => l.kbo_public_embed, open: (l) => l.kbo_public },
  { id: 'nbb', embed: () => null, open: (l) => l.nbb_consult },
  { id: 'inhoudingsplicht', embed: (l) => l.inhoudingsplicht_embed, open: (l) => l.inhoudingsplicht },
  { id: 'staatsblad', embed: () => null, open: (l) => l.staatsblad ?? 'https://www.ejustice.just.fgov.be/' },
  { id: 'web', embed: (l) => l.web_search_embed, open: (l) => l.web_search },
]

export default function EvidencePanel({ nr, links }: { nr: string; links: Links }) {
  const t = useT()
  const [active, setActive] = useState<TabId>('kaart')
  const tab = TABS.find((x) => x.id === active) ?? TABS[0]
  const embedUrl = tab.embed(links)
  const openUrl = tab.open(links)
  const label = t(`panel.tab.${tab.id}`)

  return (
    <section className="source-browser" aria-label={t('panel.chooseSource')}>
      <div className="source-toolbar">
        <label className="source-picker">
          <span>{t('panel.chooseSource')}</span>
          <select value={active} aria-controls="source-view" onChange={(e) => setActive(e.target.value as TabId)}>
            {TABS.map((x) => <option key={x.id} value={x.id}>{t(`panel.tab.${x.id}`)}</option>)}
          </select>
        </label>
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="source-external">
          {t('panel.openNew')}
        </a>
      </div>
      <div className="source-context" aria-live="polite">
        <p className="source-name">{t(`panel.bron.${tab.id}`)}</p>
        <p className="source-guidance">
          <span className="font-medium text-gray-800">{t('panel.whatToCheck')}</span> {t(`panel.check.${tab.id}`)}
        </p>
      </div>
      <div id="source-view" className="source-viewport" role="region" aria-label={label}>
        {tab.id === 'nbb' ? (
          <div className="h-full overflow-auto"><NbbPanel nr={nr} nbbConsultUrl={links.nbb_consult} /></div>
        ) : embedUrl ? (
          <iframe key={tab.id} src={embedUrl} title={label} className="h-full w-full border-0" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <div className="p-4 text-sm text-gray-600">
            <p>{t('panel.noEmbed')}</p>
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded border border-blue-700 px-3 py-1.5 text-blue-700 hover:bg-blue-50">
              {t('panel.openTab', { tab: label })}
            </a>
          </div>
        )}
      </div>
      {tab.id !== 'nbb' && (
        <p className="source-footer">
          {tab.id === 'streetview' ? t('panel.streetviewFail') : t('panel.mapFail')}{' '}
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t('panel.openNew')}</a>
        </p>
      )}
    </section>
  )
}
