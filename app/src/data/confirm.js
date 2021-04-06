import { writable } from 'svelte/store'

export const currentConfirm = writable(null)


/**
 * Get user confirmation
 * @param {String} text - the text to be translated
 * @param {Object} ops - configuration options
 * @param {String} ops.title - text to be displayed for the modal header
 * @param {String} ops.yes - text to be displayed for the affirmative response
 * @param {String} ops.no - text to be displayed for the negative response
 * @returns {Boolean}
 */
const confirm = (text, ops) => {
  return new Promise((resolve) => {
    currentConfirm.set({ ...ops, text, resolve })
  })
}

export default confirm
