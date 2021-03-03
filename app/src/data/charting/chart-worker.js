import renderLine from './line-plot'
import buffer from './buffer'

console.log('chart worker intialized')

const renderers = {
  'line': renderLine
}

let chartData = {
  canvas: null,
  ctx: null,
  type: '',
  properties: [],
  scale: {
    x: 10,
    y: 'auto'
  }
}

let port

onmessage = e => {
  if(e.data.wsPort) {
    port = e.data.wsPort
    initialize()
  } else if (e.data == 'close') {
    port.postMessage({ command: 'close' })
  } else {
    chartData = { ...chartData, ...e.data }
    // console.log('updating data', chartData)
    if(chartData.paused) {
      buffer.pause()
    } else {
      buffer.play()
    }
    if(e.data.canvas) {
      chartData.ctx = chartData.canvas.getContext("2d")
    }
  }
}



const draw = () => {
  if (chartData.ctx) {
    if (renderers[chartData.type]) {
      renderers[chartData.type](chartData)
    }
  }
  requestAnimationFrame(draw)
}
requestAnimationFrame(draw)

let lastBuffer

let skip = false

const initialize = async () => {
  port.onmessage = e => {
    if(skip) {
      skip = false
      // return
    }
    skip = true

    // console.log(e)
    const { data } = e
    const { mt } = data
    if (mt == 6) {
      let { records } = data
      // records = records.slice(0, 1)
      // records = records.concat(records).concat(records)
      // console.log(records.length)
      if(lastBuffer) {
        for(let x of [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]) {
        // for(let x of [ 1, 3, 5, 7, 9, 11 ]) {
        // for(let x of [ 6 ]) {
          let tween = []
          for(let i = 0; i < records.length; i++) {
            const last = lastBuffer[i]
            const current = records[i]
            let tweened = { ...current }
            for(let prop of chartData.properties) {
              // console.log(prop)
              const delta = (current[prop] - last[prop]) / 12
              tweened[prop] = last[prop] + delta * x
            }
            tween.push(tweened)
          }
          // setTimeout(() => buffer.write(tween), 500 / 12 * x)
        }
        setTimeout(() => buffer.write(records), 500)
        // buffer.write(lastBuffer)
        
      }
      lastBuffer = records
    }
  }

  port.postMessage({
    command: 'connect',
    channels: [ 'tczone' ]
  })
}