import notify from 'data/notifications'
import { writable } from 'svelte/store'

export class Analysis {
  constructor(type, zones, def, store, destroy = function(){}, groupName, maxTemp, user, mold) {
    this.type = type
    this.default = def
    this.store = store
    this.destroy = destroy
    this.zones = zones
    this.groupName = groupName
    this.maxTemp = maxTemp
    this.user = user
    this.mold = mold

    this.errors = []
    this.status = 'inactive'
    this.update(0)
  }

  get current_status() {
    const published = [ 
      'zones', 'errors', 'status', 'progress', 'progress_message', 'startTime', 'endTime',
      'groupName', 'maxTemp', 'user', 'mold'
    ]
    let ret = { ...this.default }
    for(let key of published) {
      ret[key] = this[key]
    }
    return ret
  }

  update(progress, status, message) {
    if(progress) this.progress = progress
    if(message) this.progress_message = message
    if(status) this.status = status
    this.store.set(this.current_status)
  }

  start(zones, completion_message = '') {
    this.startTime = new Date()
    this.zones = zones
    this.status = 'Initializing...'
    this.completion_message = completion_message
    this.update(0)
  }

  logError(e) {
    this.errors.push(e)
    this.update()
  }

  complete() {
    this.status = 'complete'
    this.endTime = new Date()
    notify.success(this.completion_message)
    this.update(100)
  }

  cancel() {
    this.destroy()
  }
}


let active = {}


// temp
let dummyTimer = {}

export default function getAnalysis(type) {

  const def = {
    type,
    errors: [],
    zones: [],
    progress: 0,
    status: 'inactive'
  }
  let store = writable(def)

  store.start = (zones, message, groupName, maxStart, user, mold) => {
    active[type] = new Analysis('fault', zones, def, store, () => {
      active[type] = null
      store.set(def)
    }, groupName, maxStart, user, mold)
    active[type].start(zones, message)

    // test with dummy data
    clearInterval(dummyTimer[type])
    const types = Object.keys(error_types)
    dummyTimer[type] = setInterval(() => {
      if (!active[type]) {
        clearInterval(dummyTimer[type])
        return
      }
      const { errors, zones } = active[type]
      if (errors.length < 20) {
        active[type].update(errors.length * 5, `Test in progress`, `Simulated error ${errors.length} of 20`)
        active[type].logError({ zone: zones[errors.length] || zones[0], type: types[errors.length] || 'tc_short' })
      } else {
        active[type].complete()
        clearInterval(dummyTimer[type])
      }
    }, 300)
    return active[type]
  }

  store.cancel = () => {
    if (active[type]) active[type].cancel()
  }

  store.reset = () => {
    if (active[type]) active[type].destroy()
    active[type] = null
  }

  return store
}


// TODO: need to internationalize these, should be a dervied store from selected language
export const error_types = {
  tc_open: {
    name: 'Thermocouple Open',
    description: 'The T/C connection is broken',
    icon: '/images/icons/analysis/thermocouple_open.jfif'
  },
  tc_reversed: {
    name: 'Thermocouple Reversed',
    description: 'The T/C connection is wired + to - at some point.',
    icon: '/images/icons/analysis/thermocouple_reversed.jfif'
  },
  tc_short: {
    name: 'Thermocouple Short',
    description: `The T/C is pinched or the controller thinks it is pinched. 
    (>98% output must see 20F(11C) rise in 5 minutes.`,
    icon: '/images/icons/analysis/thermocouple_short.jfif'
  },
  open_fuse: {
    name: 'Open Fuse',
    description: 'Fuse on ZPM module is bad.',
    icon: '/images/icons/analysis/open_fuse.jfif'
  },
  heater_short: {
    name: 'Heater Short',
    description: 'The heater is shorted or exceeds the maximum rating of the module.',
    icon: '/images/icons/analysis/heater_short.jfif'
  },
  open_heater: {
    name: 'Open Heater',
    description: 'The heater connection is broken or disconnected.',
    icon: '/images/icons/analysis/open_heater.jfif'
  },
  uncontrolled_input: {
    name: 'Uncontrolled Output',
    description: 'The output to the heater is unregulated.',
    icon: '/images/icons/analysis/uncontrolled_output.jfif'
  },
  ground_fault: {
    name: 'Ground Fault',
    description: '',
    icon: '/images/icons/analysis/ground_fault.jfif'
  },
}