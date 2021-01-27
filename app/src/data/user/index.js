import { writable } from 'svelte/store'

/** Currently logged in user */
const user = writable()
export default user


/** All available users */
export const users = writable([])

export const roles = {
  1: "Administrator",
  2: "Operator",
  3: "Process Engineer",
  4: "Setup",
  5: "Plant Manager"
}

export const defaultUser = {
  first_name: '',
  last_name: '',
  email: '',
  language: 'en-US',
  username: '',
  password: '',
  role: 3,

  can_edit_process: true,
  can_edit_hardware: true,
  can_edit_order: true,
  can_edit_calibration: true,
  can_turn_zone_off: true,
  can_turn_zone_on: true,
  can_process_temperature: true,
  can_set_automatic_manual_mode: true,
  can_lock_zone_off: true,
  can_trim_setpoint: true,
  can_deviation_setpoint: true,
  can_auto_standby: true
}
