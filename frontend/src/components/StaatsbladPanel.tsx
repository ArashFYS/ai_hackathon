import { useEffect, useState } from 'react'
import type { StaatsbladData } from '../api'
import { refreshStaatsblad } from '../api'
import { useT } from '../i18n'

/** Staatsblad tab: on demand, list the publications and point the officer to the deeds that name the filer (TICKET-037). */
export default function StaatsbladPanel({ nr, listingUrl }: { nr: string; listingUrl: string }) {
  const t = useT()
  const [data, setData] = useState<StaatsbladData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setData(null)
    setError(false)
  }, [nr])

  const fetchNow = () => {
    setLoading(true)
    setError(false)
    refreshStaatsblad(nr)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const openLink = (
    <a href={data?.url || listingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">
      {t('panel.openNew')}
    </a>
  )
  const button = (
    <button
      type="button"
      onClick={fetchNow}
      disabled={loading}
      className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {loading ? t('sb.fetching') : data ? t('sb.retry') : t('sb.fetch')}
    </button>
  )

  if (!data) {
    return (
      <div className="space-y-3 p-4 text-sm text-gray-700">
        <p>{t('sb.intro')}</p>
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">{t('sb.howto')}</p>
        {error && <p className="text-red-700">{t('common.loadError')}</p>}
        <div className="flex items-center gap-3">{button}{openLink}</div>
      </div>
    )
  }

  if (!data.available) {
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="text-gray-700">{data.note}</p>
        <div className="flex items-center gap-3">{button}{openLink}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 text-sm">
      <p className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">{t('sb.howto')}</p>
      <p className="text-gray-700">
        <span className="font-medium">{t('sb.lastPublication')}</span> {data.last_publication ?? '—'} · {t('sb.count', { n: String(data.count) })}
        {data.note && <span className="text-gray-500"> · {data.note}</span>}
      </p>
      <ul className="divide-y rounded border">
        {data.publications.map((p, i) => (
          <li key={i} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${p.likely_gemachtigde ? 'bg-green-50' : ''}`}>
            <span className="w-24 shrink-0 tabular-nums text-gray-600">{p.date}</span>
            <span className="min-w-0 flex-1 text-gray-900">{p.rubric ?? t('sb.noRubric')}</span>
            {p.likely_gemachtigde && (
              <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white">{t('sb.flag')}</span>
            )}
            {p.pdf_url && (
              <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">{t('sb.pdf')}</a>
            )}
            <a href={p.article_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{t('sb.article')}</a>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">{button}{openLink}</div>
    </div>
  )
}
