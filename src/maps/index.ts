import type { MapDefinition } from './types'
import { henon } from './henon'

export type { MapDefinition } from './types'

/** All registered maps, keyed by id */
export const maps: Record<string, MapDefinition> = {
  henon,
}
