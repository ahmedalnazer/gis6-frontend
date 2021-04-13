import renderLine from './line-plot'
import buffer from './buffer'
import { maxChunkSize } from '../realtime/buffer'

let requestAnimFrame
try {
  requestAnimFrame = requestAnimationFrame
} catch(e) {
  try {
    requestAnimFrame = webkitRequestAnimationFrame
  } catch(e) {
    try {
      requestAnimFrame = mozRequestAnimationFrame
    } catch(e) {
      requestAnimFrame = function (/* function */ callback, /* DOMElement */ element) {
        setTimeout(callback, 1000 / 60)
      }
    }
  }
}



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
  },
  bufferParams: {
    rate: 10
  }
}

let port


let stats = {}
const logStats = s => stats = { ...stats, ...s }


let renderTimes = []

let last = 0
const draw = () => {
  const t = new Date().getTime()
  if (renderers[chartData.type]) {
    postMessage({ type: 'scale', value: { xMax: stats.xMax, xMin: stats.xMin, offsets: stats.offsets }})
    renderers[chartData.type](chartData, logStats, submitLines)
    renderTimes.push(new Date().getTime() - last)
  }
  last = t
  requestAnimFrame(draw)
}

requestAnimFrame(draw)

const submitLines = lines => {
  postMessage({ type: 'lines', lines })
}

const collectStats = () => {
  const totalRender = renderTimes.reduce((t, total) => total + t, 0)
  const avgRender = totalRender / renderTimes.length
  const framerate = Math.ceil(1000 / avgRender)
  renderTimes = renderTimes.slice(-50)

  stats = { ...stats, framerate }
  chartData.framerate = framerate

  postMessage({ type: 'stats', value: stats })
}

setInterval(collectStats, 3 / 100)




const initialize = async () => {
  port.onmessage = e => {
    const { data } = e
    if(data == 'reset') {
      buffer.reset()
    } else {
      stats.bufferParams = data.params
      chartData.bufferParams = data.params
      if (data.update && data.update.length == maxChunkSize) {
        stats.loading = true
      } else {
        stats.loading = false
      }
      buffer.write(data.update)
    }
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
    if (e.data.canvas && e.data.canvas.getContext) {
      chartData.ctx = chartData.canvas.getContext("2d")
    }
  }
}