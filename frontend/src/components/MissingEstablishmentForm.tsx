import { useState } from 'react'
import type { MissingSource, Proposal } from '../api'
import { postMissing, sourceLabel } from '../api'
import { useLang, useT } from '../i18n'
import ZekerheidBadge from './ZekerheidBadge'
import { DecideButtons } from './ProposalList'

// "Vestiging ontbreekt op dit adres": a business the officer sees on the street or online that has
// no KBO record at that address — the jury's third worked-example row (TICKET-020).

const SOURCES: MissingSource[] = ['google_maps', 'street_view', 'terreinbezoek', 'website', 'andere']

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
  const t = useT()
  const { lang } = useLang()
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
      setError(t('missing.required'))
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
      setError(t('missing.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border px-2 py-1 text-sm'
  return (
    <form onSubmit={submit} className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{t('missing.button')}</h2>
        <span className="text-xs text-gray-600">{t('missing.subtitle', { street, postcode, municipality })}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">{t('missing.housenr')}</span>
          <input className={inp} value={housenr} onChange={(e) => setHousenr(e.target.value)} placeholder={t('missing.housenrPh')} />
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className="text-xs text-gray-600">{t('missing.name')}</span>
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('missing.namePh')} />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">{t('evidence.form.activity')}</span>
          <input className={inp} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder={t('missing.activityPh')} />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">{t('evidence.form.source')}</span>
          <select className={inp} value={source} onChange={(e) => setSource(e.target.value as MissingSource)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{sourceLabel(lang, s)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">{t('evidence.form.url')}</span>
          <input className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-600">{t('evidence.form.date')}</span>
          <input type="date" className={inp} value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className="text-xs text-gray-600">{t('missing.reason')}</span>
          <input className={inp} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('missing.reasonPh')} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {busy ? t('common.saving') : t('missing.submit')}
        </button>
        <button type="button" onClick={onCancel} className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-100">{t('common.cancel')}</button>
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
  const t = useT()
  const { lang } = useLang()
  const src = sourceLabel(lang, proposal.source)
  return (
    <tr className="align-top bg-amber-50/40 hover:bg-amber-50">
      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{housenr ? t('street.nr', { housenr }) : '—'}</td>
      <td className="px-3 py-2">
        <span className="font-medium">{proposal.observed_name ?? proposal.display_name}</span>
        <span className="ml-1 text-xs text-gray-500">{t('missing.rowHint')}</span>
        {proposal.observed_activity && <div className="text-xs text-gray-500">{t('missing.observedActivity')} {proposal.observed_activity}</div>}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">—</td>
      <td className="max-w-64 px-3 py-2 text-gray-700">
        {proposal.reason}
        {proposal.source && (
          <div className="text-xs text-gray-500">
            {t('reasons.source')} {proposal.source_url ? <a href={proposal.source_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{src} ↗</a> : src}
          </div>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{proposal.observed_at ?? '—'}</td>
      <td className="px-3 py-2"><ZekerheidBadge certainty="middel" /></td>
      <td className="max-w-56 px-3 py-2 text-gray-800">{t('missing.proposalText')}</td>
      <td className="px-3 py-2 whitespace-nowrap"><DecideButtons proposal={proposal} onDecided={onDecided} size="xs" /></td>
    </tr>
  )
}
