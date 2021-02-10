import { writable, derived } from 'svelte/store'

const faultAnalysis = writable({
  errors: [],
  progress: 0,
  status: 'inactive'
})

export default faultAnalysis
