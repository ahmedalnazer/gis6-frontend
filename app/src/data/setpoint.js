import { writable } from 'svelte/store'

export const activeSetpointEditor = writable('')

export const openSetpointEditorVai = writable({
  source: '',
  data: {}
})
