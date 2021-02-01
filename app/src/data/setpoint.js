import { writable } from 'svelte/store'

export const activeSetpointEditor = writable('')

activeSetpointEditor.subscribe(x => console.log(x))