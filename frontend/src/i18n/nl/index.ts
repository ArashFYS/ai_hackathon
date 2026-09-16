import { nlLabels } from './labels'
import { nlUi } from './ui'
import { nlGeo } from './geo'

/** Dutch dictionary (the source of truth for keys). Add a key here and TypeScript demands it in `en` too. */
export const nl = { ...nlLabels, ...nlUi, ...nlGeo } as const
export { nlLabels, nlUi }
