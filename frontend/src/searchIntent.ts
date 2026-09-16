import type { RecordType } from './api'

const TYPE_WORDS: Record<string, RecordType> = {
  establishment: 'establishment', establishments: 'establishment', establishgment: 'establishment',
  vestiging: 'establishment', vestigingen: 'establishment',
  enterprise: 'enterprise', enterprises: 'enterprise', onderneming: 'enterprise', ondernemingen: 'enterprise',
}

/** Reflect a conjunctive type intent in the UI without narrowing an OR expression. */
export function queryRecordType(query: string): RecordType | '' {
  const tokens = [...query.matchAll(/"([^"]+)"|(\S+)/g)].filter((match) => !match[1]).map((match) => match[2].toLowerCase())
  if (tokens.includes('or')) return ''
  const types = new Set(tokens.map((token) => TYPE_WORDS[token]).filter(Boolean))
  return types.size === 1 ? [...types][0] : ''
}
