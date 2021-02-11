import { writable } from 'svelte/store'
import notify from 'data/notifications'

const activeStandby = writable(false)

activeStandby.cancel = () => {
  activeStandby.set(false)
  notify('Standby cancelled')
}

export default activeStandby
