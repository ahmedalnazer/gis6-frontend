import { writable } from 'svelte/store'

export const currentConfirm = writable(null)

const confirm = (text, ops) => {
  return new Promise((resolve) => {
    currentConfirm.set({ ...ops, text, resolve })
  })
}

export default confirm
