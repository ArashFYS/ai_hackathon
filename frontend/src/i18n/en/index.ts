import type { nl } from '../nl'
import { enLabels } from './labels'
import { enUi } from './ui'
import { enGeo } from './geo'
import { enSearch } from './search'

/** English dictionary: must have every key of `nl` (TypeScript enforces completeness). */
export const en: Record<keyof typeof nl, string> = { ...enLabels, ...enUi, ...enGeo, ...enSearch }
