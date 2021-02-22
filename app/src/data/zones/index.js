import { writable, derived } from 'svelte/store'
import api from 'data/api'
import { id } from '../tools'

const getBit = (int, bit) => !!(int & 1 << bit)

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
    if (merged.temp_alarm && merged.temp_alarm != 16) {
      merged.hasAlarm = true
      merged.hasTempAlarm = true
      let map = [ 'tc_open', 'tc_short', 'tc_reversed', 'low', 'high', 'tc_high', 'tc_low', 'tc_power' ]
      for(let i = 0; i < map.length; i++) {
        merged.alarms[map[i]] = getBit(merged.temp_alarm, i)
      }
      merged.alarms.com_loss = getBit(merged.temp_alarm, 15)
    }
    if (merged.power_alarm) {
      // console.log('POWER ALARM', merged.power_alarm)
      merged.hasAlarm = true
      merged.hasPowerAlarm = true
      let map = [
        'open_heater', 'heater_short', 'open_fuse', 'uncontrolled_input', 'no_voltage', 'ground_fault', 
        'over_current', '', 'cross_wired', 'do_not_heat', 'tc_reversed'
      ]
      for(let i = 0; i < map.length; i++) {
        if(map[i]) {
          merged.alarms[map[i]] = getBit(merged.power_alarm, i)
        }
      }
    }
    
    if (merged.alarms.cross_wired) {
      merged.alarms.crosswired_with = merged.temp_sp
    }

    if (merged._settings) {
      merged.settings = {
        locked: getBit(merged._settings, 0),
        sealed: getBit(merged._settings, 1),
        on: getBit(merged._settings, 2),
        auto: getBit(merged._settings, 3),
        standby: getBit(merged._settings, 4),
        boost: getBit(merged._settings, 5),
        testing: getBit(merged._settings, 6),
        test_complete: getBit(merged._settings, 7)
      }
    }
    if(merged.number == 1) console.log(merged)
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
    // alias certain fields for legacy and convenience
    name: z.ZoneName,
    number: z.ZoneNumber,
    id: id(z.id),
    groups: z.ZoneGroups
  }
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
  return (await api.get('zone')).map(x => decodeZone(x))
}

zones.reload = async () => rawZones.set(await getZones())

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

window.DANGEROUS_reset_zones = async () => {
  let z
  zones.subscribe(x => z = x)()
  await Promise.all(z.map(zone => (async () => await zones.delete(zone, { skipReload: true }))()))
  zones.reload()
}

export default zones