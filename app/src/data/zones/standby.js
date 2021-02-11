import { writable } from 'svelte/store'

const activeStandby = writable(false)

activeStandby.cancel = () => {
  activeStandby.set(false)
  notify('Standby cancelled')
}

export default activeStandby
