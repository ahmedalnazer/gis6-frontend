import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg, tczone, sysinfo } from './decode.proto'

let socket
let ports = []

let connected = false
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
      console.log('connecting')
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

      for(let key of Object.keys(data)) {
        if(data[key] && data[key].constructor === Uint8Array) {
          data[key] = getString(data[key])
        }
      }

      for(let port of ports) {
        port.postMessage(data)
      }
      // postMessage(data)
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

// onmessage = async e => {
//   const { data } = e
//   if (data.command == 'start') {
//     socketTarget = data.target
//   }
//   if (data.command == 'connect') {
//     for (let channel of data.channels) {
//       await send(`+${channel}`)
//     }
//   }
// }


function getString(array) {
  var out, i, len, c
  var char2, char3

  out = ""
  len = array.length
  i = 0
  while (i < len) {
    c = array[i++]
    if (i > 0 && c === 0) break
    switch (c >> 4) {
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c)
      break
    case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++]
      out += String.fromCharCode((c & 0x1F) << 6 | char2 & 0x3F)
      break
    case 14:
      // 1110 xxxx  10xx xxxx  10xx xxxx
      char2 = array[i++]
      char3 = array[i++]
      out += String.fromCharCode((c & 0x0F) << 12 |
          (char2 & 0x3F) << 6 |
          (char3 & 0x3F) << 0)
      break
    }
  }

  return out
}


onconnect = function(e) {
  const port = e.ports[0]

  port.onmessage = async e => {
    const { data } = e
    if(data.command == 'start') {
      socketTarget = data.target
    }
    if(data.command == 'connect') {
      for(let channel of data.channels) {
        await send(`+${channel}`)
      }
    }
  }

  ports.push(port)
}