import { writable } from 'svelte/store'

export const currentConfirm = writable(null)
currentConfirm.subscribe(x => console.log(x))

const confirm = (text, fn) => {
  console.log('confirming', text)
  currentConfirm.set({ text, fn })
}

export default confirm
