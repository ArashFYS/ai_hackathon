import type { nl } from '../nl'
import { enLabels } from './labels'
import { enUi } from './ui'

/** English dictionary: must have every key of `nl` (TypeScript enforces completeness). */
export const en: Record<keyof typeof nl, string> = { ...enLabels, ...enUi }
