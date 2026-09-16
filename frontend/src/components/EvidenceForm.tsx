import { useState } from 'react'
import type { Conclusion } from '../api'
import { SOURCE_LABELS, postEvidence } from '../api'

const SOURCES = ['google_maps', 'street_view', 'website', 'terreinbezoek', 'kbo', 'nbb', 'andere'] as const
const CONCLUSIONS: { value: Conclusion; label: string }[] = [
  { value: 'actief', label: 'actief' },
  { value: 'niet_actief', label: 'niet actief' },
  { value: 'onduidelijk', label: 'onduidelijk' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EvidenceForm({ nr, onSaved }: { nr: string; onSaved: () => void }) {
  const [source, setSource] = useState<string>('google_maps')
  const [url, setUrl] = useState('')
  const [observation, setObservation] = useState('')
  const [activity, setActivity] = useState('')
  const [conclusion, setConclusion] = useState<Conclusion>('actief')
  const [observedAt, setObservedAt] = useState(today())
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!observation.trim()) {
      setError('Waarneming is verplicht.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await postEvidence(nr, {
        source,
        url: url.trim() || undefined,
        observation: observation.trim(),
        observed_activity: activity.trim() || undefined,
        conclusion,
        observed_at: observedAt,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
      })
      setUrl('')
      setObservation('')
      setActivity('')
      setPhone('')
      setEmail('')
      setWebsite('')
      onSaved()
    } catch {
      setError('Kon waarneming niet opslaan.')
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border px-2 py-1 text-sm'
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Bron</span>
        <select className={inp} value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">URL (optioneel)</span>
        <input className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className="flex flex-col sm:col-span-2">
        <span className="text-xs text-gray-600">Waarneming</span>
        <textarea className={inp} rows={2} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Wat heb je gezien?" />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Waargenomen activiteit (optioneel)</span>
        <input className={inp} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="bv. bakkerij, kapsalon" />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">Datum waarneming</span>
        <input type="date" className={inp} value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-gray-600">Contact gezien op Google Maps, website… (optioneel)</legend>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefoon" aria-label="Telefoon" />
          <input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" aria-label="E-mail" />
          <input className={inp} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" aria-label="Website" />
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-gray-600">Conclusie</legend>
        <div className="mt-1 flex gap-4">
          {CONCLUSIONS.map((c) => (
            <label key={c.value} className="flex items-center gap-1">
              <input type="radio" name="conclusion" value={c.value} checked={conclusion === c.value} onChange={() => setConclusion(c.value)} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {busy ? 'Opslaan…' : 'Waarneming opslaan'}
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  )
}
