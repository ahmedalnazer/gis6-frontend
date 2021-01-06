import { writable, derived } from 'svelte/store'
import process from './process'
import _ from 'data/language'


// info message displayed in header if no warning/error declared
const info = derived([ process, _ ], ([ $process, $_ ]) => {
  // determine default message based on whether or not a process is running
  return $process ? $_('System is running') : $_('Ready for Production')
})


// error message displayed in header, will override warning/info
const error = writable('')


// warning message displayed in header, will override info
const warning = writable('')


// calculate message to be displayed in header
const status = derived([ error, warning, info ], ([ $error, $warning, $info ]) => {
  let s = {
    level: 'info',
    message: $info
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
