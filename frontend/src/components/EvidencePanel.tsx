import { useState } from 'react'
import type { Links, RecordFull } from '../api'
import { mapLocation } from '../mapLocation'
import { useT } from '../i18n'
import NbbPanel from './NbbPanel'
import RecordMap from './RecordMap'

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

export default function EvidencePanel({ nr, links, record }: { nr: string; links: Links; record: RecordFull }) {
  const t = useT()
  const [active, setActive] = useState<TabId>('kaart')
  const tab = TABS.find((x) => x.id === active) ?? TABS[0]
  const location = mapLocation(record)
  const embedUrl = tab.id === 'kaart' ? location.embed : tab.embed(links)
  const openUrl = (tab.id === 'kaart' ? location.open : tab.open(links)) || links.google_maps
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
        <p className="source-name">{tab.id === 'kaart' ? 'OpenStreetMap · VKBO' : t(`panel.bron.${tab.id}`)}</p>
        <p className="source-guidance">
          {tab.id === 'kaart' ? (
            <>{location.hasCoordinates ? t('panel.registerPin') : t('panel.addressLookup')} {record.address}<br />{t('panel.locationUnverified')}</>
          ) : <><span className="font-medium text-gray-800">{t('panel.whatToCheck')}</span> {t(`panel.check.${tab.id}`)}</>}
        </p>
        {tab.id === 'kaart' && location.needsReview && <p className="text-xs text-amber-800">{t('panel.locationReview')}</p>}
        {tab.id === 'kaart' && <a className="text-xs text-blue-700 underline" href={links.google_maps} target="_blank" rel="noopener noreferrer">{t('panel.businessReviews')}</a>}
      </div>
      <div id="source-view" className="source-viewport" role="region" aria-label={label}>
        {tab.id === 'kaart' ? (
          location.hasCoordinates ? <RecordMap key={`${record.nr}-${record.lat}-${record.lng}`} latitude={record.lat!} longitude={record.lng!} name={record.display_name || record.nr} address={record.address} />
            : <p className="p-4 text-sm text-gray-600">{t('panel.noCoordinates')}</p>
        ) : tab.id === 'nbb' ? (
          <div className="h-full overflow-auto"><NbbPanel nr={nr} nbbConsultUrl={links.nbb_consult} /></div>
        ) : embedUrl ? (
          <iframe key={`${nr}-${tab.id}`} src={embedUrl} title={label} className="h-full w-full border-0" referrerPolicy="no-referrer" loading="eager" />
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
