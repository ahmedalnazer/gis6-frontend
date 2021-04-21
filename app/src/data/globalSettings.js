import { writable } from 'svelte/store'
import api from 'data/api'

export const sysInfo = writable({})
export const mdtMsg = writable({})


export let $globalSettings = {}
const globalSettings = writable({})
globalSettings.subscribe(s => $globalSettings = s)

globalSettings.reload = async () => {
  globalSettings.set((await api.get('/global') || [])[0])
}

export default globalSettings