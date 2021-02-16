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
      status: this.status,
      startTime: this.startTime,
      endTime:this.endTime
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
    this.endTime = new Date()
    this.update(100)
  }

  cancel() {
    this.destroy()
  }
}


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