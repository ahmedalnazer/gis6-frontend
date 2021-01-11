import { writable } from 'svelte/store'

/** Currently logged in user */
const user = writable()
export default user


/** All available users */
export const users = writable([])

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
