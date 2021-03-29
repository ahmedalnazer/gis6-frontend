import { writable, derived } from 'svelte/store'
import process from './process'
import _ from 'data/language'
import zones from 'data/zones'


// info message displayed in header if not running and no warning/error declared
const info = derived([ process, _ ], ([ $process, $_ ]) => {
  // TODO determine "ready state" messages
  return $process ? $_('Ready for Production') : $_('System is ready')
})

// info message displayed in header if no warning/error declared
const running = derived([ process, zones, _ ], ([ $process, $zones, $_ ]) => {
  // determine default message based on whether or not a process is running
  const on = $zones.find(x => x.settings && x.settings.on)
  return on && $process && $_('System is running')
})


// error message displayed in header, will override warning/info
const error = writable('')


// warning message displayed in header, will override info
const warning = writable('')


// calculate message to be displayed in header
const status = derived([ error, warning, info, running ], ([ $error, $warning, $info, $running ]) => {
  let s = {
    level: 'info',
    message: $info
  }
  if($running) {
    s.level = 'running',
    s.message = $running
  }
  if($warning) {
    s.level = 'warning',
    s.message = $warning
  }
  if($error) {
    s.level = 'error'
    s.message = $error
  }
  return s
})


export default status
