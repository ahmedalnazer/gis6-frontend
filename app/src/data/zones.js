import { writable, derived } from 'svelte/store'
import api from 'data/api'
import ws from 'data/realtime/ws'

const rawZones = writable([])

const zones = derived([ rawZones ], ([ $raw ]) => {
  let sorted = [ ...$raw ]
  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  sorted.sort((a,b) => collator.compare(a.name, b.name))
  return sorted
})

const decodeZone = z => {
  const d = {
    ...z,
    name: z.ZoneName,
    number: z.ZoneNumber,
    id: z.id,
    groups: (z.ZoneGroups || '').split(',').map(x => parseInt(x))
  }
  delete d.ZoneName
  delete d.ZoneNumber
  delete d.ZoneGroups
  return d
}

const encodeZone = z => {
  return {
    ZoneName: z.name,
    ZoneNumber: z.number || z.id,
    ZoneGroups: (z.groups || []).filter(x => !!x).join(',')
  }
}


const getZones = async () => (await api.get('zone')).map(x => decodeZone(x))

zones.reload = async () => {
  let z = await getZones()

  // TODO: remove dummy zones
  if(z.length == 0) {
    for(let i = 0; i < 50; i++) {
      await api.post('zone', encodeZone({
        name: `Zone ${i}`,
        id: i
      }))
    }
    z = await getZones()
  }

  console.log(z)
  rawZones.set(z)
}

zones.create = async zone => {
  await api.post('zone', encodeZone(zone))
  await zones.reload()
}

zones.update = async (zone, options = {}) => {
  await api.put(`zone/${zone.id}`, encodeZone(zone))
  if(!options.skipReload) await zones.reload()
}

zones.delete = async zone => {
  await api.delete(`zone/${zone.id}`)
  await zones.reload()
}

zones.reload()


export default zones