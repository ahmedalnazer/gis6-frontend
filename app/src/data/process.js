import { writable } from 'svelte/store'

// currently active process
const process = writable({ name: 'Black PP Left Door' })

// TODO: add logic here for starting/updating process

export default process
