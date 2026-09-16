import { nlLabels } from './labels'
import { nlUi } from './ui'
import { nlGeo } from './geo'
import { nlSearch } from './search'

/** Dutch dictionary (the source of truth for keys). Add a key here and TypeScript demands it in `en` too. */
export const nl = { ...nlLabels, ...nlUi, ...nlGeo, ...nlSearch } as const
export { nlLabels, nlUi }
