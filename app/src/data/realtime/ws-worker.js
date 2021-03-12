import Pbf from 'pbf'
import { tcdata, minmax, unknown_msg, tczone, sysinfo, mdtmsg } from './decode.proto'

console.log('worker updated')

const messageTypes = { tcdata, minmax, unknown_msg, tczone, sysinfo, mdtmsg }

let socket
let ports = []

let connectedChannels = []
let activeChannels = []

const updateActive = async () => {
  activeChannels = []
  for(let p of ports) {
    console.log(p.subscriptions)
    activeChannels = activeChannels.concat(p.subscriptions)
  }
  activeChannels = [ ... new Set(activeChannels) ]
  for(let c of connectedChannels) {
    if(!activeChannels.includes(c)) {
      await send(`-${c}`)
    }
  }
  console.log(ports)
  await connect()
}

const getPortData = port => {
  const p = ports.find(x => x.port == port)
  return p ? p.data : {}
}

const setPortData = (port, data) => {
  const p = ports.find(x => x.port == port)
  if(!p) {
    ports.push({ ...data, port })
  } else {
    ports = ports.map(x => {
      if(x.port == port) {
        return { ...x, ...data, port }
      }
      return x
    })
  }
}

const addPortSubscriptions = (port, subscriptions) => {
  const current = (getPortData(port) || {}).subscriptions || []
  setPortData(port, {
    subscriptions: [ ... new Set(current.concat(subscriptions)) ]
  })
  updateActive()
}


let ready = false
let socketTarget
let queue = []

const initiate = async () => {
  ready = true
  for(let fn of queue) {
    fn()
  }
  connect()
}


const createSocket = () => new Promise((resolve, reject) => {
  if(ready) resolve()
  if(!socket) {
    socket = new WebSocket(socketTarget)
    
    socket.addEventListener('open', e => {
      console.log('connecting')
      initiate()
      // connect()
    })

    socket.addEventListener('message', async e => {
      // console.log(e)
      const ts = new Date()

      const buffer = await e.data.arrayBuffer()
      const pbf = new Pbf(buffer)

      const { mt } = unknown_msg.read(pbf)
      const decoders = {
        2: 'minmax',
        3: 'sysinfo',
        4: 'tcdata',
        6: 'tczone',
        7: 'mdtmsg'
      }
      const type = decoders[mt]

      const data = messageTypes[type].read(new Pbf(buffer))

      for(let key of Object.keys(data)) {
        if(data[key] && data[key].constructor === Uint8Array) {
          data[key] = getString(data[key])
        }
      }

      // ports[0].port.postMessage(data)

      for(let { port, subscriptions } of ports) {
        if(subscriptions.includes(type)) {
          port.postMessage({ ts, data })
        }
      }
      // postMessage(data)
    })

    socket.addEventListener('close', e => {
      console.log('Socket connection lost!')
      ready = false
      socket = null
      connectedChannels = []
      setTimeout(() => {
        console.log('retrying')
        createSocket()
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

const connect = async () => {
  let toConnect = activeChannels.filter(x => !connectedChannels.includes(x))
  connectedChannels = [ ...activeChannels ]
  for(let channel of toConnect) {
    await send(`+${channel}`)
  }
}


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
  // ports[port] = {
  //   subscriptions: []
  // }

  port.onmessage = async e => {
    console.log(e.data)
    const { data } = e

    if(data.command == 'start') {
      socketTarget = data.target
    }

    if(data.command == 'connect') {
      addPortSubscriptions(port, data.channels)
    }

    if(data.command == 'close') {
      console.log('closing')
      console.log(port, getPortData(port))
      ports = ports.filter(x => x.port != port)
    }
  }
}