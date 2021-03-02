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
  properties: []
}

let port

onmessage = e => {
  if(e.data.wsPort) {
    port = e.data.wsPort
    initialize()
  } else if (e.data == 'close') {
    port.postMessage({ command: 'close' })
  } else {
    chartData = e.data
    if(e.data.canvas) {
      chartData.ctx = chartData.canvas.getContext("2d")
    }
  }
}



// setInterval(() => {
//   // console.log(chartData.ctx, chartData.type)
//   if(chartData.ctx) {
//     if(renderers[chartData.type]) {
//       // console.log('rendering')
//       renderers[chartData.type](chartData)
//     }
//   }
// }, 1000 / 30)

const draw = () => {
  if (chartData.ctx) {
    if (renderers[chartData.type]) {
      // console.log('rendering')
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
      records = records.slice(0, 50)
      // records = records.concat(records).concat(records)
      // console.log(records.length)
      if(lastBuffer) {
        // for(let x of [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]) {
        for(let x of [ 1, 3, 5, 7, 9, 11 ]) {
          let tween = []
          for(let i = 0; i < records.length; i++) {
            const last = lastBuffer[i]
            const current = records[i]
            const tempDelta = (current.actual_temp - last.actual_temp) / 12
            const powerDelta = (current.actual_current - last.actual_current) / 12
            tween.push({
              ...current,
              actual_temp: last.actual_temp + tempDelta * x,
              actual_current: last.actual_current + powerDelta * x,
            })
          }
          // console.log(tween)
          setTimeout(() => buffer.write(tween), 500 / 12 * x)
        }
        setTimeout(() => buffer.write(records), 500)
        // buffer.write(lastBuffer)
        
      }
      lastBuffer = records
      // buffer.write(data.records.slice(0,50))
      // for(let timeout of [ 100, 200, 300, 400 ]) {
      //   setTimeout(() => buffer.write(data.records), timeout)
      // }
      // console.log(data.records.length)
    }
  }

  port.postMessage({
    command: 'connect',
    channels: [ 'tczone' ]
  })
}