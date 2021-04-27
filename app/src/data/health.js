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

const health = derived([ rawHealth ], ([ $rawHealth ]) => {
  const current = $rawHealth.status

  let status = {
    moldDoctor: {
      status: 'active',
      ok: false
    }
  }

  const states = {
    0: 'unknown',
    1: 'pending',
    2: 'started',
    3: 'cancelled',
    4: 'completed',
    5: 'failed',
    6: 'max'
  }

  const okStates = [ 1, 2, 3, 4, 5, 6 ]

  if(current && current[0]) {
    status.moldDoctor.status = states[current[0]]
    status.moldDoctor.ok = okStates.includes(current[0])
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
