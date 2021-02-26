console.log('chart worker intialized')

let chartData = {
  canvas: null,
  ctx: null,
  type: '',
  properties: []
}

let port

let buffer = []

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

function smooth(ctx, points) {
  ctx.strokeStyle = "#0000bb"
  ctx.strokeRect(20, 20, 150, 100)
  
  ctx.beginPath()
  if (points == undefined || points.length == 0) {
    return true
  }
  if (points.length == 1) {
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[0].x, points[0].y)
    return true
  }
  if (points.length == 2) {
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[1].x, points[1].y)
    return true
  }
  ctx.moveTo(points[0].x, points[0].y)
  for (var i = 1; i < points.length - 2; i++) {
    var xc = (points[i].x + points[i + 1].x) / 2
    var yc = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }
  ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
  ctx.stroke()
}

const draw = () => {
  chartData.ctx.clearRect(0, 0, chartData.canvas.width, chartData.canvas.height)
  smooth(chartData.ctx, [ { x: 0, y: 0 }, { x: 20, y: 20 }, { x: 30, y: 80 }, { x: 40, y: 40 }, { x: 50, y: 70 } ])
}

setInterval(() => {
  if(chartData.ctx) draw()
}, 1000 / 1)

const initialize = async () => {
  port.onmessage = e => {
    // console.log(e)
    const { data } = e
    const { mt } = data
    if (mt == 6) {
      console.log(data.records.length)
    }
  }

  port.postMessage({
    command: 'connect',
    channels: [ 'tczone' ]
  })
}