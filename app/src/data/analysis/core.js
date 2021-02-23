import api from 'data/api'
import notify from 'data/notifications'
import { writable, derived } from 'svelte/store'
import { activeGroup } from 'data/groups'
import zones from 'data/zones'
import { sysInfo } from 'data/globalSettings'


export const activeTest = derived([ zones ], ([ $zones ]) => {
  return $zones.find(x => x.settings.testing)
})

export class Analysis {
  constructor(type, _zones, def, store, destroy = function(){}, groupName, groupId, maxTemp, user, mold) {
    this.type = type
    this.default = def
    this.store = store
    this.destroy = destroy
    this.zones = _zones
    this.groupName = groupName
    this.groupId = groupId
    this.maxTemp = maxTemp
    this.user = user
    this.mold = mold
    this.readMode = true

    // for efficient error deduping
    this.errorMap = {}
    this.errors = []

    this.canceling = false
    this.status = 'inactive'
    this.update(0)
  }

  get current_status() {
    const published = [ 
      'zones', 'errors', 'status', 'progress', 'progress_message', 'startTime', 'endTime',
      'groupName', 'groupId', 'maxTemp', 'user', 'mold', 'canceling'
    ]
    let ret = { ...this.default }
    for(let key of published) {
      ret[key] = this[key]
    }
    return ret
  }

  update(progress, status, message) {
    if(progress || progress === 0) this.progress = progress
    if(message) this.progress_message = message
    if(status) this.status = status
    this.store.set(this.current_status)
  }

  async start(_zones, completion_message = '') {
    this.startTime = new Date()
    this.zones = _zones
    this.zoneNumbers = _zones.map(x => x.number)
    this.status = 'All zones off'
    this.completion_message = completion_message
    this.update(0)
    this.unsubInfo = sysInfo.subscribe(info => {this.processInfo(info)})
    this.unsubZones = zones.subscribe(zones => {this.processZones(zones)})
    activeGroup.set(this.groupId)
    await api.post(`/analysis/${this.type}`, { temp: this.maxTemp, zones: this.zones.map(x => x.number) })
  }

  logError(zone, code) {
    if(!this.errorMap[zone.number]) {
      this.errorMap[zone.number] = []
    }
    if(!this.errorMap[zone.number].includes(code)) {
      this.errorMap[zone.number].push(code)
      this.errors.push({ zone, type: code })
      this.update()
    }
  }

  processInfo(info) {
    const msg = info && info.sys_message || ''
    this.progress = info && info.order_status / 10 || 0
    // console.log(`${this.progress}%: ${msg}`)
    if(this.unsubInfo) {
      if(msg.includes('has temperature risen')) {
        setTimeout(() => {
          if(this && !this.completed) {
            this.complete()
          }
        }, 5000)
      }
      if (this.status != 'Initializing...' && msg.startsWith('Analysis Completed')) {
        this.complete()
      } else if (!msg.startsWith('Analysis Completed') && !this.canceling) {
        this.status = msg
        this.update()
      }
    }
  }

  processZones(zones) {
    const relevant = zones.filter(x => this.zoneNumbers.includes(x.number) && ! x.settings.locked)
    const testing = relevant.filter(x => x.settings.testing)
    const tested = relevant.filter(x => x.settings.test_complete)
    if(testing.length > 1) {
      this.update(null, null, `Testing ${testing.length} zones`)
    } else if(testing.length == 1) {
      this.update(tested.length / relevant.length * 100, null, `Testing zone ${tested.length + 1} of ${relevant.length}`)
    } else {
      this.update(null, null, `Waiting...`)
    }
    if(this.readMode) {
      const errors = zones.filter(x => x.hasAlarm)
      for(let z of errors) {
        for(let key of Object.keys(z.alarms)) {
          if(availableCodes.includes(key) && z.alarms[key]) {
            this.logError(z, key)
          }
        }
      }
    }
  }

  cleanup() {
    clearInterval(this.waitTracker)
    this.unsubInfo()
    this.unsubZones()
  }

  complete() {
    this.endTime = new Date()
    this.completed = true
    this.cleanup()
    if(this.canceling) {
      this.status = 'canceled'
      notify('Test successfully canceled, resuming normal operation')
      this.destroy()
    } else {
      this.status = 'complete'
      notify.success(this.completion_message)
      this.update(100)
    }
  }

  async cancel() {
    await api.post(`/analysis/cancel`, { zones: this.zones.map(x => x.number) })
    this.canceling = true
    this.update(null, 'Canceling...')
    // possibly removing this once WS support is available
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

  store.start = (zones, message, groupName, groupId, maxStart, user, mold) => {
    active[type] = new Analysis(type, zones, def, store, () => {
      active[type] = null
      store.set(def)
    }, groupName, groupId, maxStart, user, mold)
    active[type].start(zones, message)

    // // test with dummy data
    // clearInterval(dummyTimer[type])
    // const types = Object.keys(error_types)
    // dummyTimer[type] = setInterval(() => {
    //   if (!active[type]) {
    //     clearInterval(dummyTimer[type])
    //     return
    //   }
    //   const { errors, zones } = active[type]
    //   if (errors.length < 20) {
    //     active[type].update(errors.length * 5, `Test in progress`, `Simulated error ${errors.length} of 20`)
    //     active[type].logError({ zone: zones[errors.length] || zones[0], type: types[errors.length] || 'tc_short' })
    //   } else {
    //     active[type].complete()
    //     clearInterval(dummyTimer[type])
    //   }
    // }, 300)
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

const availableCodes = Object.keys(error_types)