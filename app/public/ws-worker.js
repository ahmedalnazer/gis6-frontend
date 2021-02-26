import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg, tczone, sysinfo } from './decode.proto'

console.log('worker loaded')

let socket
let ports = []
let ready = false
let socketTarget

let queue = []

const initiate = () => {
  ready = true
  for(let fn of queue) {
    fn()
  }
}

const createSocket = () => new Promise((resolve, reject) => {
  if(ready) resolve()
  if(!socket) {
    socket = new WebSocket(socketTarget)
    
    socket.addEventListener('open', e => {
      console.log('connecting', e)
      connected = true
      initiate()
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

      for(let port of ports) {
        port.postMessage(data)
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
  queue.push(resolve)
})

const send = async msg => {
  await createSocket()
  console.log(`sending ${msg}`)
  socket.send(msg)
}

onconnect = function(e) {
  ports.push(e.ports[0])

  port.onmessage = e => {
    console.log('received message')
    if(e.command == 'start') {
      socketTarget = e.target
    }
    if(e.command == 'connect') {
      for(let channel of e.channels) {
        send(`+${channel}`)
      }
    }
  }
}