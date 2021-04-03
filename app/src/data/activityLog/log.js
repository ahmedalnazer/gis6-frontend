import { writable, derived } from 'svelte/store'
import _ from 'data/language'
import getLogText from './log-text'
import api from '../api'
import zones from 'data/zones'
import groups from 'data/groups'
import moment from 'moment'

// raw output from API
const _logs = writable([])

// Check if zones belong to a group
const isZoneInGroup = (zoneGroupArr, zoneArr) => {
  if (typeof zoneGroupArr == 'string') {
    zoneGroupArr = JSON.parse(zoneGroupArr)
  }

  return (zoneGroupArr || []).sort().toString() === zoneArr.sort().toString() 
}

// Get the group name from zones
const getZoneGroup = z => {
  let g
  let zlist

  groups.subscribe(x => g = x)()
  zones.subscribe(x => zlist = x)()

  let grpnames = []
  debugger
  if (z.length > 0 && zlist.length == z.length) {
    grpnames.push('All Zones')
  } else {
    let grps = g.filter(x => x.ref_zones.length > 0)

    for (let gp in grps) {
      let zoneInGrp = isZoneInGroup(z, grps[gp].ref_zones)
      if (zoneInGrp) {
        grpnames.push(grps[gp].name)
      }
    }  
  }

  return grpnames
}

// List of zones from id array
const getZoneListFromId = z => {
  let list
  let zoneNames = ''
  let zoneGroup = ''
  let zs

  zones.subscribe(x => list = x)()

  zs = list.filter(x => (z || []).includes(x.id))

  if (zs.length) {
    zoneNames = zs.map(x => x.name).join(',')
    zoneGroup = getZoneGroup(z)

    if (zoneGroup.length >= 1) {
      zoneNames = zoneGroup.join(',')
    }
    
    zoneNames = zoneNames.split(',').join(', ')
    
    return zoneNames
  }
  else {
    return ''
  }
}

// get zone id from its zone number
const getZoneIdFromName = z => {
  let list
  let zs
  let zarr = JSON.parse(z)

  zones.subscribe(x => list = x)()

  zs = list.filter(x => (zarr || []).includes(x.ZoneNumber))
  let zsid = zs.map(x => x.id)
  return zsid
}

// level will be stored as a number 1 - 7, we need to condense them down to "error", "warning", or "change"
const getLevel = i => {

  if(i <= 3) {
    return 'error'
  } else if (i == 4) {
    return 'warning'
  } else {
    return 'change'
  }
}

// monitor _logs and current language status
const translated = derived([ _logs, _ ], ([ $logs, $_ ]) => {

  // get human readable log data (see get message in ./log-text.js)
  return $logs.map(log => {
    return {
      ...log,
      logText: getLogText($_, log.message_text, log.ref_message, log.message_content, getZoneListFromId(getZoneIdFromName(log.zones_list))),
      logLevel: getLevel(log.ref_log_level),
      logUser: log.user? log.user: 'User not logged in',
      logCreated: moment(log.created).format("L LT")
      // logZoneNames_: getZoneList([ 293,294,295,296,297,298,300,301,302,303,304,310,291,292,299,305,306,307,308,309 ])
    }
  })
})

/**
 * Function to load logs for UI consumption (params TBD)
 * 
 * @param {Object} params 
 * @param {String} params.level
 * @param {String} params.interval 
 */
async function search(params = {}) {
  // pass params to API, automatically update all consumers
  const activityLogs = await api.get('/activity/', params)
  if (!Array.isArray(activityLogs)) {
    _logs.set([])
  }
  else {
    _logs.set(activityLogs)
  }
}

const logs = {
  subscribe: translated.subscribe,
  search
}

export default logs
