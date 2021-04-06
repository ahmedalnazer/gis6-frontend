export const maxChunkSize = 200

let params = {
  rate: 25
}

let buffer = []


const tryPush = (frame) => {
  const lastFrame = buffer[buffer.length - 1]
  if(!lastFrame) {
    buffer.push(frame)
    return
  }
  const minIntvl = 1000 / params.rate
  if(frame.time - lastFrame.time >= minIntvl) {
    buffer.push(frame)
  }
}

export default buffer

buffer.write = function ({ ts, data }) {

  // simulate 450 zones
  // data = data.concat(data).concat(data)

  const date = new Date(ts)
  const frame = { data, date, time: ts }

  // buffer.push(frame)
  tween(frame, 12)

  buffer = buffer.slice(-7500)
}


let intervals = {}
let latest = {}
let earliest = {}
let needsReset = {}

export const bufferCommands = (port, e, id) => {
  const { data } = e
  
  if (data.command == 'readBuffer') {

    // send data in batches, limiting max to avoid OOM when serializing to
    // pass between threads
    const sendChunk = () => {
      const resetBuffer = () => {
        latest[id] = buffer[buffer.length - 1] && buffer[buffer.length - 1].time
        earliest[id] = latest[id] + 1
        needsReset[id] = false
      }
      if (!latest[id] && buffer.length) {
        resetBuffer()
      }

      if(needsReset[id]) {
        port.postMessage('reset')
        resetBuffer()
        return
      }
      
      if(latest[id]) {
        const newest = buffer.filter(x => x.time > latest[id])
        const backFill = buffer.filter(x => x.time < earliest[id]).slice(-(maxChunkSize - newest.length))
        const update = backFill.concat(newest)
        // console.log(backFill.length, newest.length)
        if (update.length) {
          const latestEntry = update[update.length - 1]
          const firstEntry = update[0]
          latest[id] = latestEntry.time
          if(firstEntry.time < earliest[id]) earliest[id] = firstEntry.time
          port.postMessage({ update, params })
        }
      }
      // console.log(sizeOf([ ...buffer ]))
    }



    intervals[id] = setInterval(sendChunk, 500)
  }

  if (data.command == 'setBufferParams') {
    console.log('setting params', data.params)
    params = { ...params, ...data.params || {}}
    buffer = buffer.slice(0, 0)
    for(let key of Object.keys(needsReset)) {
      needsReset[key] = true
    }
  }

  if (data.command == 'close') {
    clearInterval(intervals[id])
    latest[id] = 0
  }
}






// utilities for testing

const tween = (next, frames) => {

  let frameList = []
  for (let i = 1; i < frames; i++) {
    frameList.push(i)
  }

  const { time, data } = next
  const lastBuffer = buffer[buffer.length - 1]

  // test tweening
  if (lastBuffer) {
    for (let x of frameList) {
      let tween = []
      for (let i = 0; i < lastBuffer.data.length; i++) {
        const last = lastBuffer.data[i]
        const current = data[i]
        if (last && current) {
          let tweened = { ...current }
          for (let prop of [ 'actual_temp', 'actual_current', 'actual_percent' ]) {
            // console.log(prop)
            const delta = (current[prop] - last[prop]) / frames
            tweened[prop] = last[prop] + delta * x
          }
          tween.push(tweened)
        }
      }
      const offset = 500 / frames * x
      const updatedTS = time - 500 + offset
      const date = new Date(updatedTS)
      setTimeout(() => tryPush({ time: updatedTS, date, data: tween }), offset)
    }
  }
  setTimeout(() => tryPush(next), 500)
}



const typeSizes = {
  "undefined": () => 0,
  "boolean": () => 4,
  "number": () => 8,
  "string": item => 2 * item.length,
  "object": item => !item ? 0 : Object
    .keys(item)
    .reduce((total, key) => sizeOf(key) + sizeOf(item[key]) + total, 0)
}

const sizeOf = value => typeSizes[typeof value](value)