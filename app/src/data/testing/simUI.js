import api from 'data/api'

const power = {
  heater_open: 0,
  heater_short: 1,
  open_fuse: 2,
  uncontrolled_output: 3,
  // no_voltage: 4,
  ground_fault: 5
}

const temp = {
  tc_open: 0,
  tc_short: 1,
  tc_reversed: 3
}

const availableCodes = Object.keys(power).concat(Object.keys(temp))
const availableMessage = `Available errors are ${availableCodes.join(', ')}\n`
const message = action => `
${action}Alarm(alarm, zones)

E.g. To ${action} the thermocouple short alarm for zones 1, 2, and 3, run the following:

> ${action}Alarm('tc_short', [ 1, 2, 3 ])

Default zone list (second argument) is [1]

${availableMessage}
`

// prevent invalid zone numbers which will crash the CM
const getZones = (list = []) => {
  list = list.filter(n => {
    let valid = true
    if(isNaN(n / 10)) valid = false
    if(n < 1 || n > 450) valid = false
    if(!valid) console.log(`${n} is not a valid zone number`)
    return valid
  })
  // list.sort()
  return list
}


/**
 * Set an alarm in the CM simulator (mirrors simUI pset/tset under the hood)
 * @param {'heater_open'|'heater_short'|'open_fuse'|'uncontrolled_output'
 * |'no_voltage'|'ground_fault'|'tc_short'|'tc_reversed'} alarm - alarm code
 * @param {Array(Number)} zones - list of zone numbers which should receive alarms
 * @returns
 */
export const setAlarm = (alarm, zones = [ 1 ]) => {
  zones = getZones(zones)
  if(!alarm || alarm == 'help') {
    console.log(message('set'))
    return
  }
  if(Object.keys(power).includes(alarm)) {
    api.post('simui/SetPowerAlarm', { argument: power[alarm], zones })
    console.log(`${alarm} Power alarm set on zones [ ${zones.join(', ')} ]`)
    return
  }
  if(Object.keys(temp).includes(alarm)) {
    api.post('simui/SetTempAlarm', { argument: temp[alarm], zones })
    console.log(`${alarm} Temperature alarm set on zones [ ${zones.join(', ')} ]`)
    return
  }
  console.log(`
${alarm} is not a valid alarm code.

${availableMessage}
  `)
}


/**
 * Clear an alarm in the CM simulator (mirrors simUI pset/tset under the hood)
 * @param {'heater_open'|'heater_short'|'open_fuse'|'uncontrolled_output'
 * |'no_voltage'|'ground_fault'|'tc_short'|'tc_reversed'} alarm - alarm code
 * @param {Array(Number)} zones - list of zone numbers which should be cleared
 * @returns
 */
export const clearAlarm = (alarm, zones = [ 1 ]) => {
  zones = getZones(zones)
  if(!alarm || alarm == 'help') {
    console.log(message('clear'))
    return
  }
  if(Object.keys(power).includes(alarm)) {
    api.post('simui/ClearPowerAlarm', { argument: power[alarm], zones })
    console.log(`${alarm} Power alarm cleared on zones [ ${zones.join(', ')} ]`)
    return
  }
  if(Object.keys(temp).includes(alarm)) {
    api.post('simui/ClearTempAlarm', { argument: temp[alarm], zones })
    console.log(`${alarm} Temperature alarm cleared on zones [ ${zones.join(', ')} ]`)
    return
  }
  console.log(`
${alarm} is not a valid alarm code.

${availableMessage}
  `)
}


const test = fn => {
  for(let i = 0; i < availableCodes.length; i++) {
    fn(availableCodes[i], [ i + 1, 20 ])
  }
}

window.testAlarms = () => test(setAlarm)
window.clearTestAlarms = () => test(clearAlarm)
