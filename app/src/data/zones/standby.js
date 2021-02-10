import { writable } from 'svelte/store'

const activeStandby = writable(false)

activeStandby.cancel = () => activeStandby.set(false)

export default activeStandby
