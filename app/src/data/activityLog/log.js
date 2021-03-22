import { writable, derived } from 'svelte/store'
import _ from 'data/language'
import getLogText from './log-text'
import api from '../api'


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

async function seedLogs(params = {}) {
  await api.post('/activity', {
    system: 'Balancing',
    message_content: '',
    created: '2021-03-19T17:14:33.591000Z',
    user: 'Admin',
    status: 0,
    ref_log_level: 5,
    ref_message: 3
  })

  await api.post('/activity', {
    system: 'Hot runner',
    message_content: '',
    created: '2021-02-19T17:14:33.591000Z',
    user: 'Admin',
    status: 0,
    ref_log_level: 1,
    ref_message: 1
  })

  await api.post('/activity', {
    system: 'Monitoring',
    message_content: '',
    created: '2021-01-19T17:14:33.591000Z',
    user: 'Admin',
    status: 0,
    ref_log_level: 2,
    ref_message: 2
  })

  await api.post('/activity', {
    system: 'Valve pin',
    message_content: '',
    created: '2021-03-19T17:14:33.591000Z',
    user: 'Admin',
    status: 0,
    ref_log_level: 2,
    ref_message: 3
  })
}

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
  // params ={
  //   "system": "Balancing",
  //   "created": "2021-03-19T17:14:33.591000Z",
  //   "user": "",
  //   "status": 0,
  //   "ref_log_level": 5,
  //   "ref_message": 3
  // }
  const activityLogs = await api.get('/activity/', params)
  if (!Array.isArray(activityLogs)) {
    // seedLogs([])
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


/*
For now, I'm thinking "search" is the only method we'll need. You can do something like this on init for testing/demo:

if( *no activities in api* ) await api.post('/activity', {dummy error} )

If Noel can take care of sending the login activity logs, we won't need to actually push anything from the api

*/