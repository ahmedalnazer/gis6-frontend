import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { id } from '../tools'

const toBinary = function (n) {
  // return new Uint32Array(n).join('')
  // return n >>> 0
  var sign = n < 0 ? "-" : ""
  var result = Math.abs(n).toString(2)
  while (result.length < 32) {
    result = "0" + result
  }
  return sign + result
}

const rawZones = writable([])
export const realtime = writable([])

export const selectedZones = writable([])
export const toggleZones = (zones) => {
  if (!Array.isArray(zones)) {
    zones = [zones]
  }
  zones = zones.map(x => id(x && x.id || x))
  let list
  selectedZones.subscribe(z => list = z)()
  for (let z of zones) {
    if (list.includes(z)) {
      list = list.filter(x => x != z)
    } else {
      list.push(z)
    }
  }
  selectedZones.set([... new Set(list)])
}


const zones = derived([rawZones, realtime], ([$raw, $realtime]) => {
  let sorted = [...$raw].map((x, i) => {
    let merged = { ...x, ...$realtime[x.number - 1] || {} }
    if (merged.power_alarm !== undefined) {
      merged.power_alarm = toBinary(merged.power_alarm)
    }
    if (merged.temp_alarm !== undefined) {
      merged.temp_alarm = toBinary(merged.temp_alarm)
    }
    return merged
  })
  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  sorted.sort((a, b) => collator.compare(a.name, b.name))
  return sorted
})

export const activeZones = derived([selectedZones, zones], ([$selectedZones, $zones]) => {
  return $zones.filter(x => $selectedZones.includes(x.id))
})

const decodeZone = z => {
  const d = {
    ...z,
    name: z.ZoneName,
    number: z.ZoneNumber,
    id: id(z.id),
    groups: z.ZoneGroups
  }

  delete d.ZoneName
  delete d.ZoneNumber
  delete d.ZoneGroups
  return d
}

const encodeZone = z => {
  let d = {
    ...z,
    ZoneName: z.name,
    ZoneNumber: z.number || z.id,
    ZoneGroups: z.groups
  }
  delete d.name
  delete d.number
  delete d.groups
  delete d.actual_current
  delete d.actual_temp
  delete d.actual_percent
  delete d.power_alarm
  delete d.settings
  delete d.temp_alarm
  delete d.temp_sp
  delete d.manual_sp

  return d
}


const getZones = async () => {
  await init()
  return (await api.get('zone')).map(x => decodeZone(x))
}

// TODO remove temporary workaround to specify 
let processes = []
let proc
let initted = false
const init = async () => {
  if(initted) return
  initted = true
  processes = await api.get('process')
  if (!processes.length) {
    proc = await api.post('process', { name: 'Dummy Process' })
  } else {
    proc = processes[0]
  }
}

zones.reload = async () => {
  let z = await getZones()

  // TODO: remove dummy zones
  if (z.length == 0) {
    for (let i = 1; i <= 50; i++) {
      await api.post('zone', encodeZone({
        name: `Zone ${i}`,
        number: i,
        ref_process: proc.id
      }))
    }
    z = await getZones()
  }

  // console.log(z)
  rawZones.set(z)
}

zones.create = async zone => {
  await api.post('zone', encodeZone(zone))
  await zones.reload()
}

zones._update = rawZones.update
zones.set = rawZones.set

zones.update = async (zone, options = {}) => {
  await api.put(`zone/${zone.id}`, encodeZone(zone))
  if (!options.skipReload) await zones.reload()
}

zones.delete = async (zone, options = {}) => {
  await api.delete(`zone/${zone.id}`)
  if (!options.skipReload) await zones.reload()
}

zones.reload()

window.DANGEROUS_reset_zones = async () => {
  let z
  zones.subscribe(x => z = x)()
  await Promise.all(z.map(zone => (async () => await zones.delete(zone, { skipReload: true }))()))
  zones.reload()
}

export default zones