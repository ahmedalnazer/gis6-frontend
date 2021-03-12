import { writable, derived } from 'svelte/store'
import _ from 'data/language'
import getLogText from './log-text'


// raw output from API
const _logs = writable([])


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
      logText: getLogText($_, log.message_id),
      logLevel: getLevel(log.log_type)
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
  _logs.set(await api.post('/activity', params))
}

const logs = {
  subscribe: translated.subscribe,
  search
}

export default logs


/*
For now, I'm thinking "search" is the only method we'll need. You can do something like this on init for testing/demo:

if( *no activities in api* ) await api.post('/activity', {dummy error} )

If Noel can take care of sending the login activity logs, we won't need to actually push anything from the api

*/