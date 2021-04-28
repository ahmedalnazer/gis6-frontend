import api from 'data/api'
import user from 'data/user'
import notify from 'data/notifications'
import zones, { getAlarms } from 'data/zones'
import { writable, derived } from 'svelte/store'
import { mdtMsg } from 'data/globalSettings'
import _, { getMessage } from 'data/language'
import health from 'data/health'
import mold from 'data/mold'


const cleanReport = r => {
  try {
    r.zones_list = JSON.parse(r.zones_list)
  } catch(e) {
    // assume already parsed
  }
  return r
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


const getReportState = r => {
  if(!r || !r.state) return 'inactive'
  const reportStates = {
    1: 'pending',
    2: 'started',
    3: 'complete',
    4: 'cancelled',
    5: 'failed',
    // 'incomplete,' but same as failed for UI purposes
    6: 'failed'
  }
  if(r.state == 4) {
    activeAnalysis.set({})
  }
  return reportStates[r.state] || 'unknown'
}


const getReportErrors = r => {
  if(!r || !r.errors) return []

  let errors = []
  for(let error of r.errors || []) {
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
        const existing = errors.find(x => x.zone == n && x.type == key)
        if(value && error_types[key] && !existing) errors.push({ zone: n, type: key })
      }
    }
  }
  return errors
}

const $_ = (...args) => {
  let translate
  _.subscribe(t => translate = t)()
  return translate(...args)
}

const getProgressMessage = report => {
  if(report.state == 1) return $_('Initializing...')
  if(report.state == 2) return $_('Running analysis...')
}


// Report for currently running analysis
const activeAnalysis = writable({})

// Reports for completed analysis by type (fault/wiring)
const completedReports = writable({})

// current message log (reset when starting an analysis)
const messages = writable([])

// current analysis progress (reset when starting an analysis)
const progress = writable(0)

// whether current analysis has been canceled (waiting for MD feedback)
const canceling = writable(false)


// compile current states into coherent functions/readout for front end
const analysis = derived(
  [ health, activeAnalysis, user, mold, messages, progress, canceling ],
  ([ $health, $activeAnalysis, $user, $mold, $messages, $progress, $canceling ]) => {

    let data = {
      type: $activeAnalysis.reportType,
      progress_message: getProgressMessage($activeAnalysis),
      available: $health.moldDoctor && $health.moldDoctor.ok,
      messages: $messages,
      progress: $progress,
      status: getReportState($activeAnalysis),
      health: $health.moldDoctor,
      canceling: $canceling
    }

    /**
     * Start (or resume) an analysis.
     * @param {Object} options - configuration options
     * @param {Object} options.report [report]  -  (optional) report to resume, other options are ignored if this is provided
     * @param {('wiring'|'fault')} options.type = type of analysis to start
     * @param {Number} options.maxTemp = max starting temp
     * @param {Array} options.zones = array of zone objects
     * @param {string} options.group = name of the selected group
     *
     * @returns {Promise}
     */
    const start = async ({ report, type, maxTemp, zones, group }) => {
      // reset progress and messages
      progress.set(0)
      messages.set([])
      canceling.set(false)

      if(!report) {
        await api.post(`/analysis/${type}`, {
          maxStartingTemp: maxTemp,
          name: `${type} analysis report`,
          reportType: type,
          zones: zones.length,
          zones_list: zones.map(x => x.number),
          zonesLocked: zones.filter(x => x.islocked).length,
          zones_locked_list: zones.filter(x => x.islocked).map(x => x.number),
          user_id: $user ? $user.id : 0,
          user: $user ? $user.username : 'None',
          group,
          mold: $mold && $mold.name
        })

        const active = await api.get('/analysis/active')
        try {
          // pull report that was just created
          for (let r of active) {
            r = cleanReport(r)
            if (r.reportType == type) {
              monitorReport(cleanReport(r.id))
            }
          }
        } catch(e) {
          console.error(e)
        }

      } else {
        monitorReport(cleanReport(report.id))
      }
    }

    /**
     * Cancel the currently active analysis
     */
    const cancel = async () => {
      await api.post(`/analysis/cancel`, { report_id: $activeAnalysis.id, user_id: $user ? $user.id : 0 })
      canceling.set(true)
    }

    return { ...data, ...$activeAnalysis, errors: getReportErrors($activeAnalysis), start, cancel }
  }
)


/**
 * Poll report with given id until complete
 * @param {Number} id
 * @returns
 */
const monitorReport = async id => {

  // schedule another poll as needed
  const keepWatching = () => setTimeout(() => monitorReport(id), 500)

  try {
    const r = cleanReport(await api.get(`/report/${id}`))

    if(r.detail && r.detail == "Not found.") {
      activeAnalysis.set({})
      return
    }

    activeAnalysis.set(r)
    if(!r.endTime) {
      // if report is still in progress, continue to poll
      keepWatching()
    } else {
      // otherwise notify the user that the analysis is complete
      if(r.state != 4) {
        if(getReportState(r) != 'failed') {
          // success notice
          notify.success(r.reportType == 'fault'
            ? $_('Fault analysis complete')
            : $_('Wiring analysis complete')
          )
        } else {
          // failure notice
          notify.error(r.reportType == 'fault'
            ? $_('Fault analysis did not complete, please re-start the analysis')
            : $_('Wiring analysis did not complete, please re-start the analysis')
          )
        }
        completedReports.update(cur => ({ ...cur, [r.reportType]: r }))
      } else {
        // confirm cancellation
        notify(r.reportType == 'fault'
          ? $_('Fault analysis canceled')
          : $_('Wiring analysis canceled')
        )
      }
    }
  } catch(e) {
    console.error(e)
    // for robustness, if anything goes wrong, continue trying to check the report
    // could result in indefinite polling, may consider alternate error handling
    keepWatching()
  }
}


// store most recently published message for deduping
let lastInfo = {}


// watch ws channel for mold doctor updates
mdtMsg.subscribe(info => {
  const id = info.dbid

  // dedupe based on id/param match
  if(id == lastInfo.id && info.parameters == lastInfo.params) {
    return
  }

  const { params, zones } = parseParams(info.parameters)

  // secondary deduping based on actual message text
  if(id == lastInfo.id) {
    let readMsg
    getMessage.subscribe(fn => readMsg = fn)()
    const lastParams = parseParams(lastInfo.params)
    if(readMsg(id, { params, zones }) == readMsg(id, lastParams)) {
      return
    }
  }

  lastInfo = { id, params: info.parameters }
  messages.update(m => [ ...m, { id, params, zones } ])
  if(info) progress.set(info.progress / 10)
})


/**
 *
 * @param {('wiring'|'fault')} type - 'fault' or 'wiring'
 * @returns
 */
export default function getAnalysis(type) {
  return derived([ analysis, completedReports ], ([ $analysis, $completedReports ]) => {

    const report = $completedReports[type]

    /**
     * Start an analysis.
     * @param {Object} options - configuration options
     * @param {Number} options.maxTemp = max starting temp
     * @param {Array} options.zones = array of zone objects
     * @param {string} options.group = name of the selected group
     *
     * @returns {Promise}
     */
    const start = async ({ maxTemp, zones, group }) => {
      await $analysis.start({ type, maxTemp, zones, group })
    }


    /**
     * Reset a completed analysis (of the given `type`)
     */
    const reset = async () => {
      // delete current completed report of `type` if it hasn't been marked as saved
      if(report && !report.saved) await api.delete(`/report/${report.id}`)

      // reset active analysis if it's the specified `type`
      if($analysis.type == type) activeAnalysis.set({})

      // reset completed report by `type`
      completedReports.update(cur => ({ ...cur, [type]: null }))
    }

    let data = {
      start,
      reset,
      status: getReportState(report),
      errors: getReportErrors(report),
      report: $completedReports[type]
    }

    // if specified `type` is the same as the active analysis, provide active analysis data
    if($analysis.type == type) {
      data = { ...data, ...$analysis, start: data.start }
    }

    return data
  })
}

/**
 * Resume an analysis that's marked as "active" in the database
 * @param {Object} report - report object from the database
 */
export const resumeAnalysis = report => {
  let a
  analysis.subscribe(an => a = an)()
  a.start({ report })
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

