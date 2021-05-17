import { derived } from 'svelte/store'
import zones from './index'
import { activeGroup } from 'data/groups'

const activeZones = derived([ zones, activeGroup ], ([ $zones, $activeGroup ]) => {
  return $activeGroup ? $zones.filter(x => x.groups && x.groups.includes($activeGroup)) : $zones
})

export default activeZones
