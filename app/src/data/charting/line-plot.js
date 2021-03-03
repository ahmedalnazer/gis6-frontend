import buffer from './buffer'
import { smooth } from './line-utils'

let chartData = {}

const draw = () => {
  const { canvas, ctx, scale, paused, properties } = chartData

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // ctx.fillStyle = '#ffffff'
  // ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  const latest = buffer.active[buffer.active.length - 1]
  let xRange = scale && scale.x ? parseInt(scale.x) : 10

  if(isNaN(xRange)) xRange = 10

  const now = new Date().getTime()
  let xMax = paused ? latest ? latest.time : now : now
  let xMin = xMax - xRange * 1000
  let renderLimit = xMin - 1000

  let sample = buffer.active.filter(x => x.time > renderLimit)

  const xScale = canvas.width / (xMax - xMin)

  // console.log(buffer.entries.length)

  let lastSample = sample[0]
  let rendered = [ ...sample ]

  // if(lastSample) rendered.push(lastSample)

  // for(let i = 0; i < sample.length; i++) {
  //   const s = sample[i]
  //   if(s.time > lastSample.time + intvl || i == sample.length - 1) {
  //     lastSample = s
  //     rendered.push(lastSample)
  //   }
  // }

  let lines = {}
  let max = {}
  let min = {}
  let autoScale = {}

  for (let prop of properties) {
    lines[prop] = []
    max[prop] = 0
    min[prop] = 99999999999999
  }


  for(let i = 0; i < rendered.length; i++) {
    const frame = rendered[i]
    
    const x = parseInt((frame.time - xMin) * xScale)

    if(x <= canvas.width) {
      for (let p = 0; p < frame.data.length; p++) {
        const point = frame.data[p]

        for(let prop of properties) {
          if (!lines[prop][p]) lines[prop][p] = []
          let y = point[prop]
          lines[prop][p].push({ x, y })
          if(y > max[prop]) max[prop] = y
          if(y < min[prop]) min[prop] = y
        }
      }
    }
  }

  for(let prop of properties) {
    autoScale[prop] = canvas.height / (max[prop] - min[prop])
  }


  // simplified lines for rendering
  let renderedLines = {}

  // maximum time gap between simplified points
  const maxIntvl = (xMax - xMin) / 100

  // minimum time, avoids subpixel points
  const minIntvl = (xMax - xMin) / 1000


  // loop through points and determine which ones are critical to geometry
  for(let prop of properties) {
    renderedLines[prop] = []

    for(let i = 0; i < lines[prop].length; i++) {
      renderedLines[prop][i] = []
      let lastX = 0

      // add point to rendered line, adjust y to scale
      const pushPoint = p => {
        // console.log(p)
        p.y = parseInt(canvas.height - (p.y - min[prop]) * autoScale[prop])
        lastX = p.x
        renderedLines[prop][i].push(p)
      }

      for (let p = 0; p < lines[prop][i].length; p++) {
        let point = lines[prop][i][p]
        pushPoint(point)
        continue

        if (p == 0 || p == lines[prop][i].length - 1) {
          pushPoint(point)
        } else {
          let last = lines[prop][i][p - 1]
          let next = lines[prop][i][p + 1]

          const slopeA = point.y - last.y
          const slopeB = next.y - point.y

          // exclude points that don't affect geometry
          if (slopeA !== slopeB) {
            // push point if gap between points is too large
            if (point.x > lastX + maxIntvl && point.x > lastX + minIntvl) {
              pushPoint(point)
            } else {
              // include pivot points
              if (
                (slopeA >= 0 && slopeB <= 0 ||
                slopeA <= 0 && slopeB >= 0) &&
                point.x > lastX + minIntvl
              ) {
                pushPoint(point)
              }
            }
          }
        }
      }
    }
  }

  // console.log(temps[0])

  const colors = {
    actual_temp: "#dd3300",
    actual_current: "#0033aa",
    actual_percent: "#33aabb"
  }

  for(let prop of properties) {
    for(let i = 0; i < renderedLines[prop].length; i++) {
      // console.log(renderedLines[prop][i].length)
      smooth(ctx, renderedLines[prop][i], colors[prop], 2)
    }
  }
}

let monitor = false

export default function renderLine(data) {
  chartData = data
  if(monitor) console.time('render')
  draw()
  if(monitor) console.timeEnd('render')
}