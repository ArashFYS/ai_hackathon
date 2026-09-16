import { useState } from 'react'
import type { MissingSource, Proposal } from '../api'
import { SOURCE_LABELS, postMissing } from '../api'
import ZekerheidBadge from './ZekerheidBadge'
import { DecideButtons } from './ProposalList'

// "Vestiging ontbreekt op dit adres": a business the officer sees on the street or online that has
// no KBO record at that address — the jury's third worked-example row (TICKET-020).

const SOURCES: MissingSource[] = ['google_maps', 'street_view', 'terreinbezoek', 'website', 'andere']
export const MISSING_PROPOSAL_TEXT = 'Nazicht: vestiging ontbreekt of adres verkeerd'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  street: string
  postcode: string
  municipality: string
  housenr?: string
  onSaved: () => void
  onCancel: () => void
}

export default function MissingEstablishmentForm({ street, postcode, municipality, housenr: initialHousenr, onSaved, onCancel }: Props) {
  const [housenr, setHousenr] = useState(initialHousenr ?? '')
  const [name, setName] = useState('')
  const [activity, setActivity] = useState('')
  const [source, setSource] = useState<MissingSource>('google_maps')
  const [url, setUrl] = useState('')
  const [observedAt, setObservedAt] = useState(today())
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!housenr.trim() || !name.trim() || !reason.trim()) {
      setError('Huisnummer, naam en toelichting zijn verplicht.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await postMissing({
        street,
        housenr: housenr.trim(),
        postcode,
        municipality,
        observed_name: name.trim(),
        observed_activity: activity.trim() || undefined,
        source,
        source_url: url.trim() || undefined,
        observed_at: observedAt,
        reason: reason.trim(),
      })
      onSaved()
    } catch {
      setError('Kon voorstel niet opslaan.')
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border px-2 py-1 text-sm'
  return (
    <form onSubmit={submit} className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Vestiging ontbreekt op dit adres</h2>
        <span className="text-xs text-gray-600">{street}, {postcode} {municipality} — niet in het register op dit adres</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">Huisnummer</span>
          <input className={inp} value={housenr} onChange={(e) => setHousenr(e.target.value)} placeholder="bv. 20" />
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className="text-xs text-gray-600">Naam zoals waargenomen</span>
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Kapsalon Voorbeeld" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">Waargenomen activiteit (optioneel)</span>
          <input className={inp} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="bv. kapsalon" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">Bron</span>
          <select className={inp} value={source} onChange={(e) => setSource(e.target.value as MissingSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">URL (optioneel)</span>
          <input className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">Datum waarneming</span>
          <input type="date" className={inp} value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className="text-xs text-gray-600">Toelichting (bewijs van activiteit)</span>
          <input className={inp} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="bv. Google-recensies 2025, Street View 2025" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {busy ? 'Opslaan…' : 'Voorstel aanmaken'}
        </button>
        <button type="button" onClick={onCancel} className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-100">Annuleren</button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  )
}

/** House number of a missing_establishment proposal, derived from its address ("Paalstraat 20 bus A, 2900 Schoten"). */
export function missingHousenr(p: Proposal, street: string): string | null {
  const addr = p.address ?? ''
  if (!addr.toLowerCase().startsWith(street.toLowerCase() + ' ')) return null
  const rest = addr.slice(street.length + 1).split(',')[0]
  return rest.split(' bus ')[0].trim() || null
}

/** Table row for a business that is not in the register at this address (same columns as a record row). */
export function MissingRow({ proposal, housenr, onDecided }: { proposal: Proposal; housenr: string | null; onDecided: () => void }) {
  return (
    <tr className="align-top bg-amber-50/40 hover:bg-amber-50">
      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{housenr ? `nr ${housenr}` : '—'}</td>
      <td className="px-3 py-2">
        <span className="font-medium">{proposal.observed_name ?? proposal.display_name}</span>
        <span className="ml-1 text-xs text-gray-500">(niet in register op dit adres)</span>
        {proposal.observed_activity && <div className="text-xs text-gray-500">Waargenomen activiteit: {proposal.observed_activity}</div>}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">—</td>
      <td className="max-w-64 px-3 py-2 text-gray-700">
        {proposal.reason}
        {proposal.source && (
          <div className="text-xs text-gray-500">
            Bron: {proposal.source_url ? <a href={proposal.source_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{SOURCE_LABELS[proposal.source] ?? proposal.source} ↗</a> : SOURCE_LABELS[proposal.source] ?? proposal.source}
          </div>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{proposal.observed_at ?? '—'}</td>
      <td className="px-3 py-2"><ZekerheidBadge certainty="middel" label="Middel" /></td>
      <td className="max-w-56 px-3 py-2 text-gray-800">{MISSING_PROPOSAL_TEXT}</td>
      <td className="px-3 py-2 whitespace-nowrap"><DecideButtons proposal={proposal} onDecided={onDecided} size="xs" /></td>
    </tr>
  )
}
