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


let stats = {}
const logStats = s => stats = s


let renderTimes = []

let last = 0
const draw = () => {
  const t = new Date().getTime()
  if (chartData.ctx) {
    if (renderers[chartData.type]) {
      renderers[chartData.type](chartData, logStats)
      renderTimes.push(new Date().getTime() - last)
    }
  }
  last = t
  requestAnimationFrame(draw)
}
requestAnimationFrame(draw)

let lastBuffer

const collectStats = () => {

  const totalRender = renderTimes.reduce((t, total) => total + t, 0)
  const avgRender = totalRender / renderTimes.length
  const framerate = Math.round(1000 / avgRender)
  renderTimes = []

  postMessage({ ...stats, framerate })
}

setInterval(collectStats, 300)




const initialize = async () => {
  port.onmessage = e => {
    // console.log(e)
    const { data } = e.data
    const { mt } = data
    if (mt == 6) {
      let { records } = data
      const ts = e.data.ts.getTime()
      // records = records.slice(0, 1)
      records = records.concat(records).concat(records)
      // records = records.slice(0, maxZones)


      // test tweening
      if(lastBuffer) {
        // for(let x of [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]) {
        for(let x of [ 2.4, 4.8, 7.2, 9.6 ]) {
        // for(let x of [ 6 ]) {
          let tween = []
          for(let i = 0; i < records.length; i++) {
            const last = lastBuffer[i]
            const current = records[i]
            if(last && current) {
              let tweened = { ...current }
              for (let prop of chartData.properties) {
                // console.log(prop)
                const delta = (current[prop] - last[prop]) / 12
                tweened[prop] = last[prop] + delta * x
              }
              tween.push(tweened)
            }
          }
          const offset = 500 / 12 * x
          setTimeout(() => buffer.write({ ts: ts - 500 + offset, data: tween }), offset)
        }
        setTimeout(() => buffer.write({ ts, data: records }), 500)
      }
      lastBuffer = records
    }
  }

  port.postMessage({
    command: 'connect',
    channels: [ 'tczone' ]
  })
}


onmessage = e => {
  if (e.data.wsPort) {
    port = e.data.wsPort
    initialize()
  } else if (e.data == 'close') {
    port.postMessage({ command: 'close' })
  } else {
    chartData = { ...chartData, ...e.data }
    // console.log('updating data', chartData)
    if (chartData.paused) {
      buffer.pause()
    } else {
      buffer.play()
    }
    if (e.data.canvas) {
      chartData.ctx = chartData.canvas.getContext("2d")
    }
  }
}