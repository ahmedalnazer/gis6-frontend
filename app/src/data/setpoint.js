import { writable } from 'svelte/store'

export const showSetpoint = writable(false)
export const toggleSetpoint = () => showSetpoint.update(x => !x)
showSetpoint.subscribe(x => console.log(x))