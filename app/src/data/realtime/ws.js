import { realtime } from 'data/zones'
import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg, tczone } from './decode.proto'

let connected

const socketTarget = import.meta.env.SNOWPACK_PUBLIC_WS_URL || `ws://localhost:8080`

// let socket = new WebSocket(`${window.location.origin}/ws`.replace(/http.*:\/\//g, 'ws://'))
let socket


const createSocket = () => {
  socket = new WebSocket(socketTarget)

  socket.addEventListener('open', e => {
    console.log('connecting', e)
    // socket.send('+minmax')
    socket.send('+tczone')
    console.log('sent +tczone message')
    connected = true
  })

  socket.addEventListener('message', async e => {
    // console.log(e)
    const buffer = await e.data.arrayBuffer()
    const pbf = new Pbf(buffer)

    const { mt } = unknown_msg.read(pbf)
    const decoders = {
      2: minmax,
      4: tcdata,
      6: tczone
    }

    const data = decoders[mt].read(new Pbf(buffer))
    if(mt == 6) {
      realtime.set(data.records)
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