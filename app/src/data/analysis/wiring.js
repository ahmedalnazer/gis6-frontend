import { writable, derived } from 'svelte/store'

const wiringAnalysis = writable({
  errors: [],
  progress: 0,
  status: 'inactive'
})

export default wiringAnalysis
