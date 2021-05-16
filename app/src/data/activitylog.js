import { writable } from 'svelte/store'

export const activeActivityLog = writable(false)

export const activityLogFilterViewBy = writable('')

export const activityLogFilterSelectSystem = writable('')

export const activityLogFilterRange = writable('')
