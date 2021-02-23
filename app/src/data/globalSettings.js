import { writable, derived } from 'svelte/store'
import api from 'data/api'

export const sysInfo_raw = writable({})

export const sysInfo = derived([ sysInfo_raw ], ([ $raw ]) => {
  const parsed = { ...$raw }
  if(parsed.sys_message) parsed.sys_message = getString(parsed.sys_message)
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




function getString(array) {
  var out, i, len, c
  var char2, char3

  out = ""
  len = array.length
  i = 0
  while (i < len) {
    c = array[i++]
    if(i > 0 && c === 0) break
    switch (c >> 4) {
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c)
      break
    case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++]
      out += String.fromCharCode((c & 0x1F) << 6 | char2 & 0x3F)
      break
    case 14:
      // 1110 xxxx  10xx xxxx  10xx xxxx
      char2 = array[i++]
      char3 = array[i++]
      out += String.fromCharCode((c & 0x0F) << 12 |
          (char2 & 0x3F) << 6 |
          (char3 & 0x3F) << 0)
      break
    }
  }

  return out
}