import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { RecordType, SearchResult, Status } from '../api'
import { getSearchResults, STATUS_CODES, statusLabel } from '../api'
import { useLang, useT } from '../i18n'
import { exportSearchRows, makeSearchRows, SEARCH_COLUMNS } from '../searchRows'
import type { SearchColumn } from '../searchRows'
import { sortTableRows } from '../tableExport'
import { queryRecordType } from '../searchIntent'
import ActivitySelect from '../components/ActivitySelect'
import SearchResults, { useSearchHeaders } from '../components/SearchResults'
import SearchExport from '../components/SearchExport'

const RESULT_LIMIT = 2000


export default function Zoeken() {
  const t = useT()
  const { lang } = useLang()
  const headers = useSearchHeaders()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? '') as RecordType | ''
  const detectedType = queryRecordType(q)
  const shownType = type || detectedType
  const status = (params.get('status') ?? '') as Status | ''
  const activity = params.get('activity') ?? ''
  const mode = 'and'
  const rawSort = params.get('sort') as SearchColumn
  const sort = SEARCH_COLUMNS.includes(rawSort) ? rawSort : 'address'
  const descending = params.get('direction') === 'desc'
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<(SearchResult & { key: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestKey = JSON.stringify([q, type, status, activity, mode])

  useEffect(() => {
    if (!params.has('mode')) return
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('mode')
      return next
    }, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    setInput((previous) => previous.trim() === q ? previous : q)
  }, [q])

  useEffect(() => {
    if (input.trim() === q) return
    const timer = setTimeout(() => {
      setParams((previous) => {
        const next = new URLSearchParams(previous)
        if (input.trim()) next.set('q', input.trim())
        else next.delete('q')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [input, q, setParams])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    getSearchResults({ q, type, status, activity, mode, limit: RESULT_LIMIT }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ ...data, key: requestKey })
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [q, type, status, activity, mode, requestKey])

  function update(next: Record<string, string>) {
    setParams((previous) => {
      const updated = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(next)) {
        if (value) updated.set(key, value)
        else updated.delete(key)
      }
      return updated
    }, { replace: true })
  }

  const pending = loading || input.trim() !== q || result?.key !== requestKey
  const rows = useMemo(() => {
    const source = result?.key === requestKey ? result.items : []
    return sortTableRows(makeSearchRows(source, lang), (row) => row.cells[sort], lang, descending)
  }, [result, requestKey, lang, sort, descending])
  const exportRows = useMemo(() => exportSearchRows(rows), [rows])
  const exportHeaders = [headers.name, t('search.col.number'), ...SEARCH_COLUMNS.slice(1).map((column) => headers[column])]

  return (
    <div className="space-y-4">
      <div>
        <h1>{t('search.title')}</h1>
        <p className="text-sm text-gray-600">
          {t('search.intro')} {' '}{t('search.introStreet')}{' '}
          <Link to="/straat" className="text-blue-700 underline">{t('nav.street')}</Link>.
        </p>
      </div>

      <form className="page-filters live-search-form" onSubmit={(e) => {
        e.preventDefault()
        update({ q: input.trim() })
      }}>
        <label className="live-search-input flex flex-col text-sm">
          <span>{t('search.term')}</span>
          <input placeholder={t('search.placeholder')} value={input} maxLength={500}
            aria-describedby="search-help" onChange={(e) => setInput(e.target.value)} />
        </label>
        <p id="search-help" className="sr-only">{t('search.liveHint')}</p>
        <label className="live-search-type flex flex-col text-sm">
          <span>{t('search.type')}</span>
          <select value={shownType} onChange={(e) => update({ type: e.target.value })}>
            <option value="">{t('common.all')}</option>
            <option value="enterprise">{t('type.enterprise')}{!type && detectedType === 'enterprise' ? ' · ' + t('search.detectedType') : ''}</option>
            <option value="establishment">{t('type.establishment')}{!type && detectedType === 'establishment' ? ' · ' + t('search.detectedType') : ''}</option>
          </select>
        </label>
        <label className="live-search-status flex flex-col text-sm">
          <span>{t('common.status')}</span>
          <select value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">{t('common.all')}</option>
            {STATUS_CODES.map((code) => <option key={code} value={code}>{statusLabel(lang, code)}</option>)}
          </select>
        </label>
        <div className="live-search-activity"><ActivitySelect value={activity} onChange={(value) => update({ activity: value })} /></div>
        <button type="submit">{t('search.button')}</button>
      </form>

      <div className="search-result-toolbar">
        <p className="text-sm text-gray-600" role="status">
          {pending ? (error ? '' : t('common.loading')) : t('search.resultCount', { shown: rows.length, total: result?.total ?? 0 })}
        </p>
        <SearchExport key={requestKey + sort + descending + lang} headers={exportHeaders} rows={exportRows} numbers={rows.map((row) => row.record.nr)} disabled={pending || error} />

      </div>
      {!pending && result && result.total > rows.length && (
        <p className="text-sm text-amber-800" role="status">{t('search.resultLimit', { limit: RESULT_LIMIT })}</p>
      )}
      <div className="results-table overflow-x-auto" aria-busy={pending && !error}>
        {error && <p className="text-red-700" role="alert">{t('common.loadError')}</p>}
        {!pending && !error && !rows.length && <p className="text-gray-500">{t('common.noResults')}</p>}
        {!pending && !error && rows.length > 0 && <SearchResults rows={rows} sort={sort} descending={descending}
          onSort={(column) => update({ sort: column, direction: sort === column && !descending ? 'desc' : 'asc' })} />}
      </div>
    </div>
  )
}
