import { useState } from 'react'
import type { Conclusion } from '../api'
import { conclusionLabel, postEvidence, sourceLabel } from '../api'
import { useLang, useT } from '../i18n'

const SOURCES = ['google_maps', 'street_view', 'website', 'terreinbezoek', 'kbo', 'nbb', 'andere'] as const
const CONCLUSIONS: Conclusion[] = ['actief', 'niet_actief', 'onduidelijk']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EvidenceForm({ nr, onSaved }: { nr: string; onSaved: () => void }) {
  const t = useT()
  const { lang } = useLang()
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
      setError(t('evidence.form.required'))
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
      setError(t('evidence.form.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border px-2 py-1 text-sm'
  return (
    <form onSubmit={submit} className="evidence-form grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">{t('evidence.form.source')}</span>
        <select className={inp} value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{sourceLabel(lang, s)}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">{t('evidence.form.url')}</span>
        <input className={inp} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label className="flex flex-col sm:col-span-2">
        <span className="text-xs text-gray-600">{t('evidence.form.observation')}</span>
        <textarea className={inp} rows={2} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder={t('evidence.form.observationPh')} />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">{t('evidence.form.activity')}</span>
        <input className={inp} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder={t('evidence.form.activityPh')} />
      </label>
      <label className="flex flex-col">
        <span className="text-xs text-gray-600">{t('evidence.form.date')}</span>
        <input type="date" className={inp} value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-gray-600">{t('evidence.form.contactLegend')}</legend>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('contactKind.phone')} aria-label={t('contactKind.phone')} />
          <input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('contactKind.email')} aria-label={t('contactKind.email')} />
          <input className={inp} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={t('contactKind.website')} aria-label={t('contactKind.website')} />
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-gray-600">{t('evidence.form.conclusion')}</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {CONCLUSIONS.map((c) => (
            <label key={c} className="flex items-center gap-1">
              <input type="radio" name="conclusion" value={c} checked={conclusion === c} onChange={() => setConclusion(c)} />
              {conclusionLabel(lang, c)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {busy ? t('common.saving') : t('evidence.form.submit')}
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  )
}
