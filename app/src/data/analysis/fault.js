import Analysis, {error_types} from './core'
import { writable, derived } from 'svelte/store'

const def = {
  type: 'fault',
  errors: [],
  zones: [],
  progress: 0,
  status: 'inactive',
  lastselectedgroup: ''
}
const faultAnalysis = writable(def)

let activeAnalysis = null
let dummyTimer

faultAnalysis.start = (zones) => {
  activeAnalysis = new Analysis('fault', zones, def, faultAnalysis, () => {
    activeAnalysis = null
    faultAnalysis.set(def)
  })
  activeAnalysis.start(zones)

  // test with dummy data
  clearInterval(dummyTimer)
  const types = Object.keys(error_types)
  dummyTimer = setInterval(() => {
    if(!activeAnalysis) {
      clearInterval(dummyTimer)
      return
    }
    const { errors, zones } = activeAnalysis
    if(errors.length < 10) {
      activeAnalysis.update(errors.length * 10)
      activeAnalysis.logError({ zone: zones[0], type: types[errors.length] || 'tc_short' })
    } else {
      activeAnalysis.complete()
    }
  }, 300)
  return activeAnalysis
}

faultAnalysis.cancel = () => {
  if(activeAnalysis) activeAnalysis.cancel()
}

faultAnalysis.reset = () => {
  if(activeAnalysis) activeAnalysis.destroy()
  activeAnalysis = null
}

export default faultAnalysis
