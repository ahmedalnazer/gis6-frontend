import { writable, derived } from 'svelte/store'
import language from '../language/current'

const _time = writable(new Date())

// clock will be at most 5s behind
setInterval(() => _time.set(new Date()), 5000)

const time = derived([ language, _time ], ([ $language, $time ]) => {
  return $time.toLocaleTimeString($language, { hour: 'numeric', minute: '2-digit' })
})

export default time
