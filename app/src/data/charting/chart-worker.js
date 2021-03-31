import renderLine from './line-plot'
import buffer from './buffer'
import { maxChunkSize } from '../realtime/buffer'


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
const logStats = s => stats = { ...stats, ...s }


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
    const { data } = e
    // console.log(data)
    if(data.update && data.update.length == maxChunkSize) {
      stats.loading = true
    } else {
      stats.loading = false
    }
    buffer.write(data.update)
  }

  port.postMessage({ command: 'readBuffer' })
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