import { writable } from 'svelte/store'

export const currentConfirm = writable(null)

const confirm = (text, fn) => {
  // console.log('confirming', text)
  currentConfirm.set({ text, fn })
}

export default confirm
