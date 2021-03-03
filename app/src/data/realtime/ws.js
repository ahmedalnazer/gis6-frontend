import { realtime } from 'data/zones'
import { sysInfo, mdtMsg } from 'data/globalSettings'
// import './ws-worker.mjs'

const socketTarget = import.meta.env.SNOWPACK_PUBLIC_WS_URL || `ws://localhost:8080`

const worker = new SharedWorker('/workers/ws-worker.js')

worker.onerror = e => {
  console.error('WS WORKER ERROR!!')
  console.error(e)
}

worker.port.start()

worker.port.onmessage = e => {
  // console.log(e)
  const { data } = e.data
  const { mt } = data
  if (mt == 6) {
    realtime.set(data.records)
  } else if (mt == 3) {
    // console.log('sys message received')
    sysInfo.set(data)
  } else if (mt == 7) {
    // console.log('mdt message received', data)
    mdtMsg.set(data)
  } else {
    // console.log(mt, JSON.stringify(data, null, 2))
  }
}


const createSocket = () => {
  worker.port.postMessage({
    command: 'start',
    target: socketTarget,
  })

  // connect to necessary channels
  worker.port.postMessage({
    command: 'connect',
    channels: [ 'tczone', 'sysinfo', 'mdtmsg' ]
  })
}

export default createSocket