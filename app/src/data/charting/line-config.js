import { writable, derived } from 'svelte/store'
import _ from 'data/language'

export const propertyOptions = derived([ _ ], ([ $_ ]) => {
  return [
    { id: 'actual_temp', name: $_('Actual Temperature'), type: 'temperature' },
    { id: 'deviation', name: $_('Deviation'), type: 'temperature' },
    { id: 'actual_current', name: $_('Heater Current'), type: 'current' },
    { id: 'manual_sp', name: $_('Manual % Setpoint'), type: 'percent' },
    { id: 'actual_percent', name: $_('Percent Output'), type: 'percent' },
    { id: 'temp_sp', name: $_('Temperature Setpoint'), type: 'temperature' },
  ]
})

const lineConfig = writable({})

export default lineConfig

export const setLineConfig = (cfg) => {
  lineConfig.update(cur => {
    const update = { ...cur, ...cfg }
    localStorage.setItem('lineConfig', JSON.stringify(update))
    return update
  })
}

try {
  const cached = JSON.parse(localStorage.getItem('lineConfig'))
  if(cached) {
    lineConfig.set(cached)
  }
} catch(e) {
  // assume corrupted, ignore
}
