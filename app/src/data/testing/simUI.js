import api from 'data/api'

const power = {
  heater_open: 0,
  heater_shorted: 1,
  open_fuse: 2,
  uncontrolled_output: 3,
  no_voltage: 4,
  ground_fault: 5
}

const temp = {
  tc_short: 0,
  tc_reversed: 1
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

export const setAlarm = (alarm, zones = [ 1 ]) => {
  if(!alarm || alarm == 'help') {
    console.log(message('set'))
    return
  }
  if(Object.keys(power).includes(alarm)) {
    api.post('simui/SetPowerAlarm', { argument: power[alarm], zones })
    console.log(`${alarm} Power alarm set`)
    return
  }
  if(Object.keys(temp).includes(alarm)) {
    api.post('simui/SetTempAlarm', { argument: temp[alarm], zones })
    console.log(`${alarm} Temperature alarm set`)
    return
  }
  console.log(`
${alarm} is not a valid alarm code.

${availableMessage}
  `)
}


export const clearAlarm = (alarm, zones = [ 1 ]) => {
  if(!alarm || alarm == 'help') {
    console.log(message('clear'))
    return
  }
  if(Object.keys(power).includes(alarm)) {
    api.post('simui/ClearPowerAlarm', { argument: power[alarm], zones })
    console.log(`${alarm} Power alarm cleared`)
    return
  }
  if(Object.keys(temp).includes(alarm)) {
    api.post('simui/ClearTempAlarm', { argument: temp[alarm], zones })
    console.log(`${alarm} Temperature alarm cleared`)
    return
  }
  console.log(`
${alarm} is not a valid alarm code.

${availableMessage}
  `)
}
