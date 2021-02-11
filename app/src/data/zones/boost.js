import { writable } from 'svelte/store'
import notify from 'data/notifications'

const activeBoost = writable(false)

activeBoost.cancel = () => {
  activeBoost.set(false)
  notify('Boost cancelled')
}

export default activeBoost