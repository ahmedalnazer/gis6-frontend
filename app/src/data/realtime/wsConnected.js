import { writable } from 'svelte/store'

const wsConnected = writable(true)
export default wsConnected
