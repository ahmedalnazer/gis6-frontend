import { writable } from 'svelte/store'
import { getId } from './tools'

const test = false

// store containing current notifications
export const notifications = writable([])

/**
 * generic function to add a notification to the notification UI
 * @param {string} msg 
 * @param {('info'|'success'|'warning'|'error')} type - type of notification, defaults to "info"
 */
let notify = (msg, type = 'info') => {
  const id = getId()
  notifications.update(n => {
    return n.concat({ id, msg, type: type || 'info' })
  })

  // remove notification after a delay
  if(!test) {
    setTimeout(() => {
      notifications.update(n => n.filter(x => x.id != id))
    }, Math.min(8000, msg.length * 200))
  }
}

/**
 * Notify user of an error using generic notification system
 * @param {string} msg - error message to display
 */
notify.error = msg => notify(msg, 'error')

/**
 * Warn user using generic notification system
 * @param {string} msg - warning message to display
 */
notify.warning = msg => notify(msg, 'warning')

/**
 * Notify user of successful operation
 * @param {string} msg - success message to display
 */
notify.success = msg => notify(msg, 'success')

export default notify

if(test) {
  notify.success('Success message')
  notify('Info message')
  notify.error('Error message')
  notify.warning('Warning message')
}
