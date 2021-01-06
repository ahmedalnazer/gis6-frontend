import { writable } from 'svelte/store'
import { getId } from './tools'

// store containing current notifications
export const notifications = writable([])

// base function to add a notification to the notification UI
let notify = (msg, type = 'info') => {
  console.log('adding, ', msg)
  const id = getId()
  notifications.update(n => {
    return n.concat({ id, msg, type: type || 'info' })
  })

  // remove notification after a delay
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id != id))
  }, Math.min(8000, msg.length * 200))
}

notify.error = msg => notify(msg, 'error')
notify.warning = msg => notify(msg, 'warning')
notify.success = msg => notify(msg, 'success')

export default notify
