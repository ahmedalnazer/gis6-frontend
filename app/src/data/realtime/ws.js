import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg } from './decode.proto'

let connected

// let socket = new WebSocket(`${window.location.origin}/ws`.replace(/http.*:\/\//g, 'ws://'))
let socket = new WebSocket(`ws://localhost:5000`)

socket.addEventListener('open', e => {
  console.log('connecting', e)
  socket.send('+minmax')
  socket.send('+tcdata')
  connected = true
})

socket.addEventListener('message', async e => {
  const buffer = await e.data.arrayBuffer()
  const pbf = new Pbf(buffer)

  const { mt } = unknown_msg.read(pbf)
  const decoders = {
    2: minmax,
    4: tcdata
  }

  const data = decoders[mt].read(new Pbf(buffer))
  // console.log(mt, JSON.stringify(data, null, 2))
})

socket.addEventListener('close', e => {
  console.log('connected', e)
})

console.log('socket created', socket)

export default socket