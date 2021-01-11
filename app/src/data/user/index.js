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
  role: 'Process Engineer',
  permissions: {
    edit_process: true,
    edit_hardware: true,
    edit_order: true,
    home_calibration: true,
    zone_off: true,
    zone_on: true,
    process_temp_setpoint: true,
    automatic_manual: true,
    lock_zone_off: true,
    trim_setpoint: true,
    deviation_setpoint: true,
    auto_standby: true
  }
}
