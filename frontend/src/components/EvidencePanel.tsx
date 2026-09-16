import { useState } from 'react'
import type { Links, RecordFull } from '../api'
import { mapLocation } from '../mapLocation'
import NbbPanel from './NbbPanel'

type TabId = 'kaart' | 'streetview' | 'kbo' | 'nbb' | 'web' | 'inhoudingsplicht'

interface Tab {
  id: TabId
  label: string
  bron: string
  check: string
  embed: (l: Links) => string | null
  open: (l: Links) => string
}

const TABS: Tab[] = [
  { id: 'kaart', label: "Map & reviews", bron: 'Google Maps', check: "Reviews, opening hours, photos and whether the business appears at this address", embed: (l) => l.google_maps_embed, open: (l) => l.google_maps },
  { id: 'streetview', label: 'Street View', bron: 'Google Street View', check: "Signage, facade and vacant premises", embed: (l) => l.street_view_embed, open: (l) => l.street_view },
  { id: 'kbo', label: 'KBO', bron: "KBO Public Search (FOD Economie)", check: "Activities, establishments and status", embed: (l) => l.kbo_public_embed, open: (l) => l.kbo_public },
  { id: 'nbb', label: "Annual accounts", bron: "NBB Balanscentrale", check: "Recent filings, revenue and staff", embed: () => null, open: (l) => l.nbb_consult },
  { id: 'inhoudingsplicht', label: "Withholding check", bron: "Check Inhoudingsplicht (RSZ · FOD Financiën · RSVZ)", check: "Tax or social security debts: use the check on the source website", embed: (l) => l.inhoudingsplicht_embed, open: (l) => l.inhoudingsplicht },
  { id: 'web', label: 'Website', bron: "Web search", check: "Business website, contact details and recent posts", embed: (l) => l.web_search_embed, open: (l) => l.web_search },
]

export default function EvidencePanel({ nr, links, record }: { nr: string; links: Links; record: RecordFull }) {
  const [active, setActive] = useState<TabId>('kaart')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]
  const location = mapLocation(record)
  const embedUrl = tab.id === 'kaart' ? location.embed : tab.embed(links)
  const openUrl = tab.id === 'kaart' ? location.open : tab.open(links)

  return (
    <section className="source-browser" aria-label="Inspect sources">
      <div className="source-toolbar">
        <label className="source-picker">
          <span>Inspect sources</span>
          <select aria-controls="source-view" value={active} onChange={(e) => setActive(e.target.value as TabId)}>
            {TABS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        {openUrl && <a href={openUrl} target="_blank" rel="noopener noreferrer" className="source-external">
          Open in new window <span aria-hidden="true">↗</span>
        </a>}
      </div>
      <div className="source-context" aria-live="polite">
        <p className="source-name">{tab.bron}</p>
        {tab.id === 'kaart' ? <div className="map-location-note">
          <p>{location.label}</p>
          <p>{record.address || "Address unknown"}{location.coordinates ? ` · ${location.coordinates}` : ''}</p>
          <p className={location.needsReview ? 'text-amber-800' : undefined}>
            {location.needsReview ? "Address or coordinates need review. See the assessment reasons." : "Registered location; business presence still needs verification."}
          </p>
          <a href={links.google_maps} target="_blank" rel="noopener noreferrer">Find business & reviews ↗</a>
        </div> : <p className="source-guidance">
          <span>What to check: </span>{tab.check}
        </p>}
      </div>
      <div id="source-view" className="source-viewport" role="region" aria-label={tab.label}>
        {tab.id === 'nbb' ? (
          <div className="h-full overflow-auto"><NbbPanel nr={nr} nbbConsultUrl={links.nbb_consult} /></div>
        ) : embedUrl ? (
          <iframe key={tab.id} src={embedUrl} title={tab.label} className="h-full w-full border-0" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <p className="p-3 text-sm text-gray-500">No embedded view available.</p>
        )}
      </div>
      {tab.id !== 'nbb' && openUrl && (
        <p className="source-footer">
          Source not loading?{' '}
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open in new window ↗</a>
        </p>
      )}
    </section>
  )
}
