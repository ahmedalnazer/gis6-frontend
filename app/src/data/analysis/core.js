import api from 'data/api'
import user from 'data/user'
import notify from 'data/notifications'
import { writable, derived } from 'svelte/store'
import { activeGroup } from 'data/groups'
import zones, { getAlarms } from 'data/zones'
import { mdtMsg } from 'data/globalSettings'
import _, { getMessage } from 'data/language'


export const activeTest = derived([ zones ], ([ $zones ]) => {
  return $zones.find(x => x.settings.testing)
})

export class Analysis {
  constructor(type, _zones, def, store, destroy = function(){}, groupName, groupId, maxTemp, user, mold) {
    if(_zones[0] && typeof _zones[0] == 'number') {
      let z
      zones.subscribe(current => z = current)()
      _zones = _zones.map(number => z.find(x => x && x.number == number))
    }

    this.type = type
    this.default = def
    this.store = store
    this._destroy = destroy
    this.zones = _zones
    this.zoneNumbers = _zones.map(x => x.number)
    this.groupName = groupName
    this.groupId = groupId
    this.maxTemp = maxTemp
    this.user = user
    this.mold = mold
    this.readMode = true
    this.log = []
    this.completion_message = 'Analysis Complete'

    // for efficient error deduping
    this.errorMap = {}
    this.report_errors = []
    this.errors = []

    this.canceling = false
    this.status = 'inactive'
    this.update(0)

    this.errorChecker = setInterval(() => this.checkErrors(), 1000)
  }

  get current_status() {
    const published = [ 
      'zones', 'errors', 'status', 'progress', 'progress_message', 'startTime', 'endTime',
      'groupName', 'groupId', 'maxTemp', 'user', 'mold', 'canceling', 'log', 'reportId'
    ]
    let ret = { ...this.default }
    for(let key of published) {
      ret[key] = this[key]
    }
    if(this.status == 'complete') {
      ret.errors = this.report_errors
    }
    return ret
  }

  update(progress, status, message) {
    if(progress || progress === 0) this.progress = progress
    if(message) this.progress_message = message
    if(status) this.status = status
    this.store.set(this.current_status)
  }

  async setup(report) {
    this.update(0)
    mdtMsg.set({})
    this.unsubInfo = mdtMsg.subscribe(info => { this.processInfo(info) })
    this.unsubZones = zones.subscribe(zones => { this.processZones(zones) })
    this.unsubUser = user.subscribe(user => { this.user = user })
    this.zoneNumbers = this.zones.map(x => x.number)

    if(!report) {
      await api.post(`/analysis/${this.type}`, {
        maxStartingTemp: this.maxTemp,
        zones_list: this.zones.map(x => x.number),
        name: `${this.type} analysis report`,
        reportType: this.type,
        zones: this.zones.length,
        zonesLocked: this.zones.filter(x => x.islocked).length,
        user_id: this.user ? this.user.id : 0,
        group: this.groupName
      })
    } else {
      this.status = 'resuming'
    }

    const active = await api.get('/analysis/active')
    // console.log(active)
    for (let r of active) {
      if (r.reportType == this.type) {
        this.report = r
        this.reportId = r.id
      }
    }
  }

  async start(_zones, completion_message = '') {
    this.startTime = new Date()
    this.zones = _zones
    this.status = 'All zones off'
    this.completion_message = completion_message
    
    activeGroup.set(this.groupId)
   

    await this.setup()

    
  }

  logError(zone, code) {
    zone = zone.number || zone
    if(!this.errorMap[zone]) {
      this.errorMap[zone] = []
    }
    if(!this.errorMap[zone].includes(code)) {
      this.errorMap[zone].push(code)
      this.errors.push({ zone, type: code })
      this.update()
    }
  }

  lastInfo = {}

  processInfo(info) {
    const id = info.dbid

    // dedupe based on id/param match
    if(id == this.lastInfo.id && info.parameters == this.lastInfo.params) {
      return
    } 

    // read parameters and zone list out of "parameters" string
    const parseParams = parameters => {
      // parse string to pull out components
      const split1 = parameters.split('arguments": ')[1]
      const zoneSplit = '}, "zones_list": '
      const parts = split1.split(zoneSplit)
      const params = JSON.parse(parts[0])
      // compensate for odd message formatting
      if (parts[1].endsWith('}')) parts[1] = parts[1].slice(0, -1)
      const zones = JSON.parse(parts[1])
      return { params, zones }
    }
    
    const { params, zones } = parseParams(info.parameters)

    // secondary deduping based on actual message text
    if(id == this.lastInfo.id) {
      let readMsg
      getMessage.subscribe(fn => readMsg = fn)()
      const lastParams = parseParams(this.lastInfo.params)
      if(readMsg(id, { params, zones }) == readMsg(id, lastParams)) {
        return
      }
    }

    this.lastInfo = { id, params: info.parameters }

    this.log.push({ id, params, zones })

    // message ids which constitute a completed analysis
    const closers = [ 2007, 2008, 2009 ]

    this.progress = info && info.progress / 10 || 0
    // console.log(`${this.progress}%: ${msg}`)
    if(this.unsubInfo) {
      if (closers.includes(id)) {
        console.log('closing')
        this.complete()
      }
    }
  }

  async checkErrors(skipCheck) {
    if(this.reportId) {
      this.report = await api.get(`/report/${this.reportId}`)
      this.raw_report_errors = this.report.errors
      this.report_errors = []
      for(let error of this.raw_report_errors) {
        if (error.message_content) {
          let temp = 0
          let power = 0
          for (let a of error.message_content.arguments) {
            if (a.type == 'temperatureAlarm') temp = a.value
            if (a.type == 'powerAlarm') power = a.value
          }
          const alarms = getAlarms(power, temp)
          let list = error.zones_list
          try {
            list = JSON.parse(list)
          } catch(e) {
            // assume already parsed
          }
          const n = list[0]
          for (let [ key, value ] of Object.entries(alarms)) {
            if(value) this.report_errors.push({ zone: n, type: key })
          }
        }
      }
      this.startTime = new Date(this.report.startTime)
      this.endTime = new Date(this.report.endTime)
      if(!skipCheck && this.report.endTime && this.status != 'complete') {
        this.status = 'complete'
        this.errors = this.report_errors
        this.complete()
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
    if (this.readMode) {
      const errors = zones.filter(x => x.hasAlarm)
      for (let z of errors) {
        for (let key of Object.keys(z.alarms)) {
          if (availableCodes.includes(key) && z.alarms[key]) {
            this.logError(z, key)
          }
        }
      }
    }
  }

  async cleanup() {
    await this.checkErrors(true)
    clearInterval(this.waitTracker)
    clearInterval(this.errorChecker)
    try {
      this.unsubInfo()
      this.unsubZones()
    } catch(e) {
      // assume already unsubscribed
    }    
  }

  async complete() {
    this.endTime = new Date()
    this.completed = true
    this.status = 'complete'
    await this.cleanup()
    if(this.canceling) {
      this.status = 'canceled'
      notify('Test successfully canceled, resuming normal operation')
      this.destroy()
    } else {
      if(this.report && this.report.errors) {
        this.errors = this.report.errors
      }
      notify.success(this.completion_message)
      this.update(100)
    }
  }

  async destroy() {
    await this.checkErrors()
    if(this.report && !this.report.saved) {
      await api.delete(`/report/${this.reportId}`)
    }
    this.update()
    this._destroy()
  }

  async cancel() {
    await api.post(`/analysis/cancel`, { report_id: this.reportId, user_id: this.user ? this.user.id : 0 })
    this.canceling = true
    this.update(null, 'Canceling...')
    // possibly removing this once WS support is available
  }
}




let active = {}

export default function getAnalysis(type, report) {
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

    return active[type]
  }

  store.setup = (report) => {
    active[type] = new Analysis(
      type,
      JSON.parse(report.zones_list),
      def,
      store,
      () => {
        active[type] = null
        store.set(def)
      },
      report.group,
      null,
      report.maxStartingTemp, 
      null, report.mold
    )
    active[type].setup(report)
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