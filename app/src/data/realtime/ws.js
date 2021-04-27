import { realtime } from 'data/zones'
import { rawHealth } from 'data/health'
import { sysInfo, mdtMsg } from 'data/globalSettings'

// import './ws-worker.mjs'

const socketTarget = import.meta.env.SNOWPACK_PUBLIC_WS_URL || `ws://${window.location.hostname}:8080`

const worker = new Worker('/workers/ws-worker.js')

// worker.onerror = e => {
//   console.error('WS WORKER ERROR!!')
//   console.error(e)
// }

// worker.port.start()

let logged = []
let loggedZones = [ 1 ]
window.logWS = (messageTypes, zones) => {
  if(messageTypes == 'help') {
    console.log(`

params:
1. array of message types to log (pass [] to disable logging)
2. number of zones/records for tczone (optional, defaults to [ 1 ])

e.g. this will log all 'tczone' messages for the first two zones:

> logWS([ 'tczone' ], [ 1, 2 ])

Currently supported messages types are 'tczone', 'mdtmsg', 'healthstatus' and 'sysinfo'.
Messages are displayed exactly as translated by the protobuf parser.

    `)
  } else {
    logged = messageTypes || []
    if(zones) {
      loggedZones = zones
    } else {
      loggedZones = [ 1 ]
    }
  }
  if(logged.length == 0) return 'WS logging disabled'
  return `Logging ${logged.join(', ')}`
}

worker.onmessage = e => {
  // console.log(e.data)
  if(!e || !e.data || !e.data.data) return
  const { data } = e.data
  const { mt } = data
  if (mt == 6) {
    const { records } = data

    if(logged.includes('tczone')) {
      let logged = []
      for(let i = 0; i < records.length; i++) {
        if(loggedZones.includes(i + 1)) {
          logged.push(records[i])
        }
      }
      console.log(logged.length == 1 ? logged[0] : logged)
    }

    realtime.set(data.records)
  } else if (mt == 3) {
    // console.log('sys message received')
    if (logged.includes('sysinfo')) console.log(data)
    sysInfo.set(data)
  } else if (mt == 7) {
    // console.log('mdt message received', data)
    if (logged.includes('mdtmsg')) console.log(data)
    mdtMsg.set(data)
  } else if (mt == 8) {
    if (logged.includes('healthstatus')) console.log(data)
    rawHealth.set(data)
  } else {
    // console.log(mt, JSON.stringify(data, null, 2))
  }
}

/**
 * Initialize websocket connection
 * @returns null
 */
function createSocket () {
  worker.postMessage({
    command: 'start',
    target: socketTarget,
  })

  // connect to necessary channels
  worker.postMessage({
    command: 'connect',
    channels: [ 'tczone', 'sysinfo', 'mdtmsg', 'healthstatus' ]
  })
}

export default createSocket

export const connectWS = () => {
  const connection = new MessageChannel()
  worker.postMessage({ port: connection.port1 }, [ connection.port1 ])
  return { worker, port: connection.port2 }
}

export const updateBufferParams = params => {
  localStorage.setItem('buffer-params', JSON.stringify(params))
  worker.postMessage({ command: 'setBufferParams', params })
}

const paramString = window.localStorage.getItem('buffer-params') || '{}'
const params = JSON.parse(paramString)

updateBufferParams(params)
