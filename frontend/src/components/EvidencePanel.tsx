import { useState } from 'react'
import type { Links } from '../api'
import NbbPanel from './NbbPanel'

type TabId = 'kaart' | 'streetview' | 'kbo' | 'nbb' | 'web' | 'inhoudingsplicht' | 'staatsblad'

interface Tab {
  id: TabId
  label: string
  bron: string
  check: string
  embed: (l: Links) => string | null
  open: (l: Links) => string
}

const TABS: Tab[] = [
  { id: 'kaart', label: 'Kaart & recensies', bron: 'Google Maps', check: "Recensies, openingsuren, foto's en of de zaak op dit adres verschijnt", embed: (l) => l.google_maps_embed, open: (l) => l.google_maps },
  { id: 'streetview', label: 'Street View', bron: 'Google Street View', check: 'Uithangbord, gevel, leegstand', embed: (l) => l.street_view_embed, open: (l) => l.street_view },
  { id: 'kbo', label: 'KBO', bron: 'KBO Public Search (FOD Economie)', check: 'Activiteiten, vestigingen, status', embed: (l) => l.kbo_public_embed, open: (l) => l.kbo_public },
  { id: 'nbb', label: 'Jaarrekeningen', bron: 'NBB Balanscentrale', check: 'Recente neerleggingen, omzet, personeel', embed: () => null, open: (l) => l.nbb_consult },
  { id: 'inhoudingsplicht', label: 'Inhoudingsplicht', bron: 'Check Inhoudingsplicht (RSZ · FOD Financiën · RSVZ)', check: 'Fiscale of sociale schulden: klik op "Controleren"', embed: (l) => l.inhoudingsplicht_embed, open: (l) => l.inhoudingsplicht },
  { id: 'staatsblad', label: 'Staatsblad', bron: 'Belgisch Staatsblad (FOD Justitie)', check: 'Publicaties: oprichting, ontbinding, faillissement, adreswijziging', embed: () => null, open: (l) => l.staatsblad ?? 'https://www.ejustice.just.fgov.be/' },
  { id: 'web', label: 'Website', bron: 'Webzoekopdracht', check: 'Eigen website, contactgegevens, recente berichten', embed: (l) => l.web_search_embed, open: (l) => l.web_search },
]

export default function EvidencePanel({ nr, links }: { nr: string; links: Links }) {
  const [active, setActive] = useState<TabId>('kaart')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]
  const embedUrl = tab.embed(links)
  const openUrl = tab.open(links)

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-wrap border-b bg-gray-50 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`px-3 py-2 ${t.id === active ? 'border-b-2 border-gray-900 bg-white font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-start justify-between gap-3 border-b px-3 py-2 text-xs text-gray-600">
        <p>
          <span className="font-medium text-gray-800">Bron:</span> {tab.bron} ·{' '}
          <span className="font-medium text-gray-800">Wat te controleren:</span> {tab.check}
        </p>
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded border bg-white px-2 py-1 font-medium text-blue-700 hover:bg-gray-50">
          Open in nieuw venster ↗
        </a>
      </div>
      <div className="min-h-0 flex-1">
        {tab.id === 'nbb' ? (
          <div className="h-full overflow-auto"><NbbPanel nr={nr} nbbConsultUrl={links.nbb_consult} /></div>
        ) : embedUrl ? (
          <iframe key={tab.id} src={embedUrl} title={tab.label} className="h-full w-full border-0" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <div className="p-4 text-sm text-gray-600">
            <p>Deze bron laat geen ingesloten weergave toe.</p>
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded border border-blue-700 px-3 py-1.5 text-blue-700 hover:bg-blue-50">
              Open {tab.label} in nieuw venster ↗
            </a>
          </div>
        )}
      </div>
      {tab.id !== 'nbb' && (
        <p className="border-t px-3 py-1.5 text-xs text-gray-500">
          {tab.id === 'streetview' ? 'Opent Street View niet?' : 'Laadt de kaart niet?'}{' '}
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open in nieuw venster ↗</a>
        </p>
      )}
    </div>
  )
}
