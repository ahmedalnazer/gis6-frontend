import Analysis, { error_types } from './core'
import { writable, derived } from 'svelte/store'

const def = {
  type: 'fault',
  errors: [],
  zones: [],
  progress: 0,
  status: 'inactive'
}
const wiringAnalysis = writable(def)

let activeAnalysis = null
let dummyTimer

wiringAnalysis.start = (zones, message) => {
  activeAnalysis = new Analysis('wiring', zones, def, wiringAnalysis, () => {
    wiringAnalysis.set(def)
  })
  activeAnalysis.start(zones, message)

  // test with dummy data
  clearInterval(dummyTimer)
  const types = Object.keys(error_types)
  dummyTimer = setInterval(() => {
    if (!activeAnalysis) {
      clearInterval(dummyTimer)
      return
    }
    const { errors, zones } = activeAnalysis
    if (errors.length < 20) {
      activeAnalysis.update(errors.length * 5, `Test in progress`, `Simulated error ${errors.length} of 20`)
      activeAnalysis.logError({ zone: zones[errors.length] || zones[0], type: types[errors.length] || 'tc_short' })
    } else {
      clearInterval(dummyTimer)
      activeAnalysis.complete()
    }
  }, 300)
  return activeAnalysis
}

wiringAnalysis.cancel = () => {
  if (activeAnalysis) activeAnalysis.cancel()
}

wiringAnalysis.reset = () => {
  if (activeAnalysis) activeAnalysis.destroy()
  activeAnalysis = null
}

export default wiringAnalysis
