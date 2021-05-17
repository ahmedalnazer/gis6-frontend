import api from 'data/api'
import _ from './i18n'
import { writable, derived } from 'svelte/store'

// pull activity messages from db
const activityMessages = writable([])
api.get('activity-message').then(messages => activityMessages.set(messages))


const getSystemMessage = derived([ _, activityMessages ], ([ $_, $activityMessages ]) => {

  // return function to translate
  return (id, options) => {
    options = options || {}
    const params = options.params || []
    const zones = options.zones || []

    const ops = { params, zones }
    let index = {
      1: () => $_('User logged in.', ops),
      2: () => $_('User logged out.', ops),
      3: () => $_('User account $0 created', ops),
      4: () => $_('User account $0 updated.', ops),

      2001: () => $_('$0', ops),
      2002: () => $_('$0 $1', ops),
      2003: () => $_('$0 $1 $2', ops),

      2004: () => $_('Setpoints Saved', ops),
      2005: () => $_('Setpoints Restored', ops),

      2006: () => $_('Analysis Started', ops),
      2007: () => $_('Analysis Complete', ops),
      2008: () => $_('Analysis Failed', ops),
      2009: () => $_('Analysis Aborted', ops),


      2010: () => $_("Waiting for all zones to cool below analysis temperature $0", ops),
      2011: () => $_("Waiting for '$0' to cool it is at $1", ops),
      2012: () => $_("$z locked and monitoring", ops),
      2013: () => $_("$z set point is being changed to $0", ops),
      2014: () => $_("$z is being change to $0%", ops),
      2015: () => $_("Waiting for zones to reach analysis temperature", ops),
      2016: () => $_("Shutdown reason: $0", ops),
      2017: () => $_("Zone '$0' failed to reach analysis temperature", ops),
      2018: () => $_("Turning on $z.", ops),
      2019: () => $_("Turn off $z.", ops),
      2020: () => $_("Monitoring manual zones waiting for $0 more seconds", ops),
      2021: () => $_("Waiting on '$0' to reach setpoint", ops),
      2022: () => $_("Temperature Fault(s): $0", ops),
      2023: () => $_("Power Fault(s): $0", ops),
      2024: () => $_("Waiting for zone $0 to reach analysis temperature", ops),
      2025: () => $_("The zone $0 is heating $z", ops),
    }

    for (let m of $activityMessages) {
      if (!index[m.id]) {
        index[m.id] = () => $_(m.message_text, ops)
      }
    }

    return index[id]()
  }
})

export default getSystemMessage
