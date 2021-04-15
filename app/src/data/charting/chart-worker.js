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


let refreshRate = 60

// get refresh rate for current display
const getRefreshRate = async (frames = 60) => {
  return new Promise((resolve, reject) => {
    let last
    const times = []
    const getTime = n => {
      const now = new Date().getTime()
      if(last) times.push(now - last)
      last = now

      if(n == 0) {
        const total = times.reduce((total, t) => total + t, 0)
        const avg = total / times.length
        resolve(1000 / avg)
      } else {
        requestAnimFrame(() => getTime(n - 1))
      }
    }
    getTime(frames)
  })
}

getRefreshRate(1000).then(rate => {
  if(rate < 40) {
    refreshRate = 30
  }
  // console.log(refreshRate)
})


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
  },
  // current datapoint density setting (1 - 4)
  resolution: 4
}

let port


let stats = {}
const logStats = s => stats = { ...stats, ...s }

// most recent set of render times (to determine frame rate)
let renderTimes = []

// framerate snapshots to monitor system strain
let performanceHistory = []

// track most recent 
let lastResolutionChange = new Date().getTime()

// track number of times max Resolution recommended
let maxResCount = 0



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
  const now = new Date().getTime()

  const totalRender = renderTimes.reduce((t, total) => total + t, 0)
  const avgRender = totalRender / renderTimes.length
  const framerate = Math.ceil(1000 / avgRender)
  performanceHistory.push(framerate)

  // keep last 10s of framerate data for performance monitoring
  performanceHistory = performanceHistory.slice(-30)

  // truncate frame data to keep a rolling average
  renderTimes = renderTimes.slice(-60)

  // if enough time has passed, calculate recommended resolution
  if(now - lastResolutionChange > 1000) {
    lastResolutionChange = now

    const recommended = Math.ceil((framerate - 15) * 4 / (refreshRate - 15))

    if(recommended > 3 && chartData.resolution == 3) {
      if(maxResCount > 3) {
        chartData.resolution = 4
      } else {
        maxResCount += 1
      }
    } else {
      maxResCount = 0

      // ensure we're aiming for recommended +/- 1
      if (recommended - 1 > chartData.resolution) {
        chartData.resolution += 1
      } else if (recommended + 1 < chartData.resolution) {
        chartData.resolution -= 1
      }
    }

    // clamp at 1 - 4
    chartData.resolution = Math.max(1, Math.min(chartData.resolution, 4))

    stats.resolution = chartData.resolution
  }

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