import { writable, derived } from 'svelte/store'
import api from 'data/api'

const rawZones = writable([])

const zones = derived([ rawZones ], ([ $raw ]) => {
  let sorted = [ ...$raw ]
  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  sorted.sort((a,b) => collator.compare(a.name, b.name))
  return sorted
})


zones.reload = async () => {
  let z = await api.get('zones')

  // TODO: remove dummy zones
  if(z.length == 0) {
    for(let i = 0; i < 50; i++) {
      await api.post('zones', {
        name: `Zone ${i}`,
        id: i
      })
    }
    z = await api.get('zones')
  }

  rawZones.set(z)
}

zones.create = async zone => {
  await api.post('zones', zone)
  await zones.reload()
}

zones.update = async (zone, options = {}) => {
  await api.patch('zones', zone)
  if(!options.skipReload) await zones.reload()
}

zones.delete = async zone => {
  await api.delete('zones', zone)
  await zones.reload()
}

zones.reload()


export default zones