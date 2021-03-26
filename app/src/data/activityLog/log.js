import { writable, derived } from 'svelte/store'
import _ from 'data/language'
import getLogText from './log-text'
import api from '../api'
import zones from 'data/zones'
import groups from 'data/groups'
import moment from 'moment'

// raw output from API
const _logs = writable([])

const isZoneInGroup = (zoneGroupArr, zoneArr) => {
  return zoneGroupArr.sort().toString() === zoneArr.sort().toString() 
}

const getZoneGroup = z => {
  let g
  groups.subscribe(x => g = x)()
  let grpnames = []

  let grps = g.filter(x => x.ref_zones.length > 0)

  for (let gp in grps) {
    let zoneInGrp = isZoneInGroup(z, grps[gp].ref_zones)
    if (zoneInGrp) {
      grpnames.push(grps[gp].name)
    }
  }

  return grpnames
}

const getZoneList = z => {
  let list
  let zoneNames = ''
  let zoneGroup = ''
  let zs

  zones.subscribe(x => list = x)()
  
  zs = list.filter(x => z.includes(x.id))

  if (zs.length) {
    zoneNames = zs.map(x => x.name).join(',')
    zoneGroup = getZoneGroup(z)

    if (zoneGroup.length >= 1) {
      zoneNames = zoneGroup.join(',')
    }
    
    return zoneNames
  }
  else {
    return ''
  }
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
      logText: getLogText($_, log.message_text, log.ref_message, log.message_content, getZoneList(log.zones)),
      logLevel: getLevel(log.ref_log_level),
      logUser: log.user? log.user: 'User not logged in',
      logCreated: moment(log.created).format("L LT"),
      logZoneNames: getZoneList(log.zones) //,
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
// async function search(params = {}) {
//   // pass params to API, automatically update all consumers
//   _logs.set(await api.post('/activity', params))
//   // _logs.set(await api.get('/activity', params))
// }

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
