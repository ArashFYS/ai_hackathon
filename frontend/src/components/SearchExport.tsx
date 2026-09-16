import { useEffect, useState } from 'react'
import { getExportContacts } from '../api'
import { useT } from '../i18n'
import { serializeTable, spreadsheetCell } from '../tableExport'
import { selectExport } from '../exportSelection'
import type { ContactMap, ExportMode } from '../exportSelection'

export default function SearchExport({ headers, rows, numbers, disabled }: {
  headers: string[]; rows: string[][]; numbers: string[]; disabled: boolean
}) {
  const t = useT()
  const [mode, setMode] = useState<ExportMode>('table')
  const [selected, setSelected] = useState(headers.map((_, index) => String(index)))
  const [contacts, setContacts] = useState<{ key: string; data: ContactMap } | null>(null)
  const [contactError, setContactError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)
  const [copying, setCopying] = useState(false)
  const contactLabels = { email: t('contactKind.email'), phone: t('contactKind.phone'), website: t('contactKind.website') }
  const columns = [...headers.map((label, index) => ({ value: String(index), label })),
    ...Object.entries(contactLabels).map(([value, label]) => ({ value, label }))]
  const needsContacts = mode === 'emails' || mode === 'phones' || (mode === 'custom' && selected.some((column) => column in contactLabels))
  const numberKey = numbers.join(',')
  const waiting = needsContacts && numbers.length > 0 && contacts?.key !== numberKey

  useEffect(() => {
    if (!needsContacts || !numberKey || disabled) return
    const controller = new AbortController()
    setContactError(false)
    getExportContacts(numberKey.split(','), controller.signal).then((result) => {
      if (!controller.signal.aborted) setContacts({ key: numberKey, data: result.contacts })
    }).catch(() => {
      if (!controller.signal.aborted) setContactError(true)
    })
    return () => controller.abort()
  }, [needsContacts, numberKey, disabled])

  const output = selectExport(headers, rows, numbers, mode, selected,
    contacts?.key === numberKey ? contacts.data : {}, contactLabels)
  const unavailable = disabled || waiting || (needsContacts && contactError) || !output.rows.length || !output.headers.length
  const clipboardText = output.plain ? output.rows.map((row) => spreadsheetCell(row[0])).join('\n')
    : serializeTable(output.headers, output.rows, '\t')

  function choose(next: ExportMode) {
    setMode(next)
    setCopied(false)
    setManual(false)
  }

  async function copy() {
    setCopied(false)
    setManual(false)
    setCopying(true)
    try {
      await navigator.clipboard.writeText(clipboardText)
      setCopied(true)
    } catch {
      setManual(true)
    } finally {
      setCopying(false)
    }
  }

  function download() {
    const blob = new Blob(['\ufeff', serializeTable(output.headers, output.rows, ',')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'records-' + mode + '-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="search-export">
      <p className="export-scope">{t('search.exportScope', { n: numbers.length })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="export-choice">
          <span>{t('search.exportChoice')}</span>
          <select value={mode} onChange={(e) => choose(e.target.value as ExportMode)}>
            <option value="table">{t('search.exportTable')}</option>
            <option value="emails">{t('search.exportEmails')}</option>
            <option value="phones">{t('search.exportPhones')}</option>
            <option value="custom">{t('search.exportCustom')}</option>
          </select>
        </label>
        {mode === 'custom' && <details className="export-columns">
          <summary>{t('search.exportColumns')} ({selected.length})</summary>
          <fieldset aria-label={t('search.exportColumns')}>
            {columns.map((column) => <label key={column.value}>
              <input type="checkbox" checked={selected.includes(column.value)} onChange={(e) => {
                const checked = e.target.checked
                setSelected((previous) => columns.filter((c) => c.value === column.value ? checked : previous.includes(c.value)).map((c) => c.value))
                setCopied(false)
                setManual(false)
              }} />
              {column.label}
            </label>)}
          </fieldset>
        </details>}
        <button type="button" className="result-action" disabled={unavailable} onClick={download}>{t('search.exportCsv')}</button>
        <button type="button" className="result-action" disabled={unavailable || copying} onClick={copy}>{t('search.copy')}</button>
        <span className="text-xs text-gray-600" role="status">{copied ? t('search.copied', { n: output.rows.length }) : ''}</span>
      </div>
      {needsContacts && <p className="export-note" role="status">
        {contactError ? t('search.exportContactError') : waiting ? t('common.loading')
          : !output.rows.length ? t('search.exportEmpty') : t('search.exportContactNote')}
      </p>}
      {manual && <label className="mt-3 block text-xs text-gray-600">
        {t('search.copyFallback')}
        <textarea readOnly className="mt-2 w-full" rows={4} value={clipboardText} onFocus={(e) => e.target.select()} />
      </label>}
    </div>
  )
}
