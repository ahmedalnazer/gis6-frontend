export default class Analysis {
  constructor(type = '', zones = [], def = {}, store = {}, destroy = function(){}) {
    this.type = type
    this.default = def
    this.store = store
    this.destroy = destroy
    this.zones = zones
    this.errors = []
    this.status = 'inactive'
    this.update(0)
  }

  get current_status() {
    return {
      ...this.default,
      zones: this.zones,
      errors: this.errors,
      status: this.status,
      progress: this.progress,
      progress_message: this.progress_message,
      status: this.status
    }
  }

  update(progress, message, status) {
    if(progress) this.progress = progress
    if(message) this.progress_message = message
    if(status) this.progress_status = status
    this.store.set(this.current_status)
  }

  start(zones) {
    this.startTime = new Date()
    this.zones = zones
    this.status = 'Initializing...'
    this.update(0)
  }

  logError(e) {
    this.errors.push(e)
    this.update()
  }

  complete() {
    this.status = 'complete'
    this.update(100)
  }

  cancel() {
    this.destroy()
  }
}


export const error_types = {
  tc_open: {
    name: 'Thermocouple Open',
    description: 'The T/C connection is broken'
  },
  tc_reversed: {
    name: 'Thermocouple Reversed',
    description: 'The T/C connection is wired + to - at some point.'
  },
  tc_short: {
    name: 'Thermocouple Short',
    description: `The T/C is pinched or the controller thinks it is pinched. 
    (>98% output must see 20F(11C) rise in 5 minutes.`
  },
  open_fuse: {
    name: 'Open Fuse',
    description: 'Fuse on ZPM module is bad.'
  },
  heater_short: {
    name: 'Heater Short',
    description: 'The heater is shorted or exceeds the maximum rating of the module.'
  },
  open_heater: {
    name: 'Open Heater',
    description: 'The heater connection is broken or disconnected.'
  },
  uncontrolled_input: {
    name: 'Uncontrolled Output',
    description: 'The output to the heater is unregulated.'
  },
  ground_fault: {
    name: 'Ground Fault',
    description: ''
  },
}