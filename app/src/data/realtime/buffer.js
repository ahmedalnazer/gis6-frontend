export const maxChunkSize = 200

let buffer = []

export default buffer

buffer.write = function ({ ts, data }) {

  // simulate 450 zones
  data = data.concat(data).concat(data)

  const date = new Date(ts)
  const frame = { data, date, time: ts }

  // buffer.push(frame)
  tween(frame, 12)

  buffer = buffer.slice(-7500)
}


let intervals = {}
let latest = {}

export const bufferCommands = (port, e, id) => {
  const { data } = e
  
  if (data.command == 'readBuffer') {

    // send data in batches, limiting max to avoid OOM when serializing to
    // pass between threads
    const sendChunk = () => {
      if (!latest[id]) latest[id] = buffer[0] && buffer[0].time

      if (latest[id]) {
        const remaining = buffer.filter(x => x.time > latest[id])
        const update = remaining.slice(0, maxChunkSize)
        if (update.length) {
          const latestEntry = update[update.length - 1]
          latest[id] = latestEntry.time
          port.postMessage({ update })
        }
      }
      // console.log(sizeOf([ ...buffer ]))
    }

    intervals[id] = setInterval(sendChunk, 100)
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
      setTimeout(() => buffer.push({ time: updatedTS, date, data: tween }), offset)
    }
  }
  setTimeout(() => buffer.push(next), 500)
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