import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { id } from '../tools'

const getBit = (int, bit) => int & 1 << bit

const rawZones = writable([])
export const realtime = writable([])

export const selectedZones = writable([])
export const toggleZones = (zones) => {
  if (!Array.isArray(zones)) {
    zones = [ zones ]
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
  selectedZones.set([ ... new Set(list) ])
}


const zones = derived([ rawZones, realtime ], ([ $raw, $realtime ]) => {
  let sorted = [ ...$raw ].map((x, i) => {
    let merged = { ...x, ...$realtime[x.number - 1] || {}}
    merged._settings = merged.settings
    merged.settings = {}
    merged.alarms = {}
    merged.hasAlarm = false
    merged.hasTempAlarm = false
    merged.hasPowerAlarm = false
    if (merged.temp_alarm) {
      merged.hasAlarm = true
      merged.hasTempAlarm = true
      let map = [ 'tc_open', 'tc_shorted', 'tc_reversed', 'low', 'high', 'tc_high', 'tc_low', 'tc_power' ]
      for(let i; i < map.length; i++) {
        merged.alarms[map[i]] = getBit(merged.temp_alarm, i)
      }
      merged.alarms.com_loss = getBit(merged.temp_alarm, 15)
    }
    if (merged.power_alarm) {
      merged.hasAlarm = true
      merged.hasPowerAlarm = true
      // merged.temp_alarm = toBinary(merged.temp_alarm)
    }
    if (merged._settings) {
      merged.settings = {
        locked: getBit(merged._settings, 0),
        sealed: getBit(merged._settings, 1),
        on: getBit(merged._settings, 2),
        auto: getBit(merged._settings, 3)
      }
    }
    return merged
  })
  var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  sorted.sort((a, b) => collator.compare(a.name, b.name))
  // console.log(sorted[0] && sorted[0].alarms)
  return sorted
})

export const activeZones = derived([ selectedZones, zones ], ([ $selectedZones, $zones ]) => {
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

const clean = z => {
  delete z.name
  delete z.number
  delete z.groups
  delete z.actual_current
  delete z.actual_temp
  delete z.actual_percent
  delete z.power_alarm
  delete z.settings
  delete z.temp_alarm
  delete z.temp_sp
  delete z.manual_sp
  delete z._settings
  delete z.alarms
  delete z.hasAlarm
  delete z.hasTempAlarm
  delete z.hasPowerAlarm
  return z
}

const encodeZone = z => {
  let d = {
    ...z,
    ZoneName: z.name,
    ZoneNumber: z.number || z.id,
    ZoneGroups: z.groups
  }
  d = clean(d)
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


/**
 * 
 * @param {Object|Array} zones 
 * @param {*} options 
 */
zones.update = async (updatedZones, update, options = {}) => {
  if(!Array.isArray(updatedZones)) updatedZones = [ updatedZones ]
  const url = `/zones/${options.actions || ''}`
  const data = {
    ref_process_id: updatedZones[0].ref_process,
    zones: updatedZones.map(x => x.number),
    data: clean(update)
  }
  await api.post(url, data)
  // await api.put(`zone/${zone.id}`, encodeZone(zone))
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