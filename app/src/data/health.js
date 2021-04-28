import { wsConnected } from './realtime/ws'
import { derived, writable } from 'svelte/store'

// enum PbProcessStatus {
//   ProcessStatusUnknown = 0;
//   ProcessStatusPending =1;
//   ProcessStatusStarted =2;
//   ProcessStatusCancelled =3;
//   ProcessStatusCompleted = 4;
//   ProcessStatusFailed = 5;
//   ProcessStatusMax =6;
// }
/*enum ProcessIndex{
  kProcessMoldDoctor,
  kProcessIndexMax,
};
*/

export const rawHealth = writable({})


const states = {
  0: 'unknown',
  1: 'pending',
  2: 'started',
  3: 'cancelled',
  4: 'completed',
  5: 'failed',
  6: 'max'
}

let lastKnown = {}

const getStatus = (key, current) => {
  if(!lastKnown[key]) lastKnown[key] = []
  const { status, secs } = current
  lastKnown[key].push(secs)
  let ret = {}
  ret.status = states[status]

  // compare last 3 timestamps, if all are the same, ok = false
  ret.ok = lastKnown[key].length < 2 // assume true until at least 3 data points collected
  for(let ts of lastKnown[key]) {
    if(ts != lastKnown[key][0]) {
      ret.ok = true
    }
  }

  lastKnown[key] = lastKnown[key].slice(-1)
  return ret
}

const health = derived([ rawHealth, wsConnected ], ([ $rawHealth, $wsConnected ]) => {
  const current = $rawHealth.status

  let status = {
    ws: {
      ok: $wsConnected
    },
    moldDoctor: {
      status: 'pending',
      ok: true
    }
  }


  if(current && current[0]) {
    status.moldDoctor = getStatus('moldDoctor', current[0])
  }

  return status
})

export default health


export const systemReady = derived([ health ], ([ $health ]) => {
  for(let [ key, status ] of Object.entries($health)) {
    if(!status.ok) {
      return false
    }
  }
  return true
})

// health.subscribe(s => console.log(s))
