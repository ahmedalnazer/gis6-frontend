import { writable, derived } from 'svelte/store'
import api from 'data/api'

export const sysInfo_raw = writable({})

export const sysInfo = derived([ sysInfo_raw ], ([ $raw ]) => {
  const parsed = { ...$raw }
  // if(parsed.sys_message) parsed.sys_message = getString(parsed.sys_message)
  // console.log(parsed.sys_message)
  return parsed
})


export let $globalSettings = {}
const globalSettings = writable({})
globalSettings.subscribe(s => $globalSettings = s)

globalSettings.reload = async () => {
  globalSettings.set((await api.get('/global') || [])[0])
}

export default globalSettings