import { writable } from 'svelte/store'

export let activeProcess = { name: 'Black PP Left Door' }

// currently active process
const process = writable({ name: 'Black PP Left Door' })
process.subscribe(p => activeProcess = p)

// TODO: add logic here for starting/updating process

export default process
