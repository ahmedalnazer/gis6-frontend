import { realtime } from 'data/zones'
import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg, tczone, sysinfo } from './decode.proto'
import { sysInfo_raw } from 'data/globalSettings'

let connected

const socketTarget = import.meta.env.SNOWPACK_PUBLIC_WS_URL || `ws://localhost:8080`

// let socket = new WebSocket(`${window.location.origin}/ws`.replace(/http.*:\/\//g, 'ws://'))
let socket


const createSocket = () => {
  socket = new WebSocket(socketTarget)

  socket.addEventListener('open', e => {
    console.log('connecting', e)
    // socket.send('+minmax')
    
    const send = msg => {
      console.log(`sending ${msg}`)
      socket.send(msg)
    }

    setTimeout(() => {
      send('+tczone')
      send('+sysinfo')
    }, 100)

    connected = true
  })

  socket.addEventListener('message', async e => {
    // console.log(e)
    const buffer = await e.data.arrayBuffer()
    const pbf = new Pbf(buffer)

    const { mt } = unknown_msg.read(pbf)
    const decoders = {
      2: minmax,
      3: sysinfo,
      4: tcdata,
      6: tczone
    }

    const data = decoders[mt].read(new Pbf(buffer))
    if(mt == 6) {
      realtime.set(data.records)
    } else if(mt == 3) {
      // console.log('sys message received')
      sysInfo_raw.set(data)
    } else {
      console.log(mt, JSON.stringify(data, null, 2))
    }
  })

  socket.addEventListener('close', e => {
    console.log('Socket connection lost!')
    connected = false
    setTimeout(() => {
      // createSocket()
    }, 1000)
  })
}

// createSocket()


// console.log('socket created', socket)

export default createSocket