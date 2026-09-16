import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { RecordSummary, RecordType, Status } from '../api'
import { STATUS_CODES, activitySectorLabel, activitySourceLabel, contactStatusLabel, dash, getRecords, recordTypeLabel, registerLabel, statusLabel } from '../api'
import { useLang, useT } from '../i18n'
import StatusBadge from '../components/StatusBadge'
import ZekerheidBadge from '../components/ZekerheidBadge'
import ActivitySelect from '../components/ActivitySelect'

export default function Zoeken() {
  const t = useT()
  const { lang } = useLang()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? '') as RecordType | ''
  const status = (params.get('status') ?? '') as Status | ''
  const activity = params.get('activity') ?? ''
  const [input, setInput] = useState(q)
  const [items, setItems] = useState<RecordSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    getRecords({ q, type, status, activity, limit: 100 })
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q, type, status, activity])

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    setParams(p)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t('search.title')}</h1>
        <p className="text-sm text-gray-600">
          {t('search.intro')}
          {' '}{t('search.introStreet')}{' '}
          <Link to="/straat" className="text-blue-700 underline">{t('nav.street')}</Link>.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: input.trim() })
        }}
      >
        <label className="flex min-w-64 flex-1 flex-col text-sm">
          <span className="mb-1 text-gray-600">{t('search.term')}</span>
          <input
            className="rounded border px-3 py-1.5"
            placeholder={t('search.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">{t('search.type')}</span>
          <select className="rounded border px-2 py-1.5" value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">{t('common.all')}</option>
            <option value="enterprise">{t('type.enterprise')}</option>
            <option value="establishment">{t('type.establishment')}</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">{t('common.status')}</span>
          <select className="rounded border px-2 py-1.5" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">{t('common.all')}</option>
            {STATUS_CODES.map((s) => (
              <option key={s} value={s}>{statusLabel(lang, s)}</option>
            ))}
          </select>
        </label>
        <ActivitySelect value={activity} onChange={(v) => update({ activity: v })} />
        <button type="submit" className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
          {t('search.button')}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-white">
        {loading && <p className="p-4 text-sm text-gray-500">{t('common.loading')}</p>}
        {!loading && error && <p className="p-4 text-sm text-red-700">{t('common.loadError')}</p>}
        {!loading && !error && items && items.length === 0 && <p className="p-4 text-sm text-gray-500">{t('common.noResults')}</p>}
        {!loading && !error && items && items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">{t('search.col.name')}</th>
                <th className="px-3 py-2">{t('search.col.type')}</th>
                <th className="px-3 py-2">{t('col.address')}</th>
                <th className="px-3 py-2">{t('search.col.activity')}</th>
                <th className="px-3 py-2">{t('col.register')}</th>
                <th className="px-3 py-2">{t('col.status')}</th>
                <th className="px-3 py-2">{t('col.certainty')}</th>
                <th className="px-3 py-2">{t('search.col.contact')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((r) => (
                <tr key={r.nr} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/record/${r.nr}`} className="font-medium text-blue-700 hover:underline">
                      {r.display_name || dash(r.name)}
                    </Link>
                    <div className="text-xs text-gray-500">{r.nr}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{recordTypeLabel(lang, r.record_type)}</td>
                  <td className="px-3 py-2 text-gray-700">{dash(r.address)}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.activity?.sector === 'onbekend' ? <span className="text-gray-400">{t('common.unknown')}</span> : activitySectorLabel(lang, r.activity?.sector, r.activity?.label)}
                    {r.activity?.source && <div className="text-xs text-gray-500">{activitySourceLabel(lang, r.activity.source)}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{registerLabel(lang, r.assessment?.register_label)}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.assessment.status} label={r.assessment.status_label} /></td>
                  <td className="px-3 py-2"><ZekerheidBadge certainty={r.assessment.certainty} label={r.assessment.certainty_label} /></td>
                  <td className="px-3 py-2 text-xs text-gray-600" title={t('search.contactTitle')}>{contactStatusLabel(lang, r.contact_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {items && items.length >= 100 && (
        <p className="text-xs text-gray-500">{t('search.limit')}</p>
      )}
    </div>
  )
}
