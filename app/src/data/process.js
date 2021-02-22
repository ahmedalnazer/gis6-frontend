import { writable } from 'svelte/store'

export let activeProcess = { name: 'Black PP Left Door' }

// currently active process
const process = writable({ name: 'Black PP Left Door' })
process._set = process.set
process.set = (p) => {
  activeProcess = p
  process._set(p)
}

// TODO: add logic here for starting/updating process

export default process
