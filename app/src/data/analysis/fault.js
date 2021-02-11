import Analysis from './core'
import { writable, derived } from 'svelte/store'

const def = {
  type: 'fault',
  errors: [],
  zones: [],
  progress: 0,
  status: 'inactive'
}
const faultAnalysis = writable(def)

let activeAnalysis = null

faultAnalysis.start = (zones) => {
  activeAnalysis = new Analysis('fault', zones, def, faultAnalysis, () => {
    faultAnalysis.set(def)
  })
  return activeAnalysis
}

faultAnalysis.cancel = () => {
  if(activeAnalysis) activeAnalysis.cancel()
}

export default faultAnalysis
