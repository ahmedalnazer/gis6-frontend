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

wiringAnalysis.start = (zones) => {
  activeAnalysis = new Analysis('wiring', zones, def, wiringAnalysis, () => {
    wiringAnalysis.set(def)
  })
  activeAnalysis.start(zones)

  // test with dummy data
  clearInterval(dummyTimer)
  const types = Object.keys(error_types)
  dummyTimer = setInterval(() => {
    if (!activeAnalysis) {
      clearInterval(dummyTimer)
      return
    }
    const { errors, zones } = activeAnalysis
    if (errors.length < 10) {
      activeAnalysis.update(errors.length * 10)
      activeAnalysis.logError({ zone: zones[0], type: types[errors.length] || 'tc_short' })
    } else {
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
