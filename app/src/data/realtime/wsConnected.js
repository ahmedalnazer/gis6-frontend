import { writable } from 'svelte/store'

const wsConnected = writable(false)
export default wsConnected
