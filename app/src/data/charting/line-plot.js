import buffer from './buffer'
import { smooth } from './line-utils'

const draw = (chartData, logStats) => {
  const { canvas, ctx, scale, paused, properties, maxLinePoints, maxZones } = chartData
  
  const latest = buffer.active[buffer.active.length - 1]
  let xRange = scale && scale.x ? parseInt(scale.x) : 10

  if(isNaN(xRange)) xRange = 10

  const now = new Date().getTime() - 500
  let xMax = paused ? latest ? latest.time : now : now
  let xMin = xMax - xRange * 1000
  let renderLimit = xMin - 1000
  let dX = xMax - xMin

  // let sample = buffer.active.filter(x => x.time > renderLimit)

  let sample = []

  for (let i = buffer.active.length; i >= 0; i--) {
    const frame = buffer.active[i]
    // console.log(frame && frame.time, renderLimit)
    if (frame) {
      if (frame.time >= renderLimit) {
        sample.unshift(frame)
      } else {
        break
      }
    }
  }

  const xScale = canvas.width / (xMax - xMin)

  let numIntvls = 0
  let totalIntvl = 0

  // sample 50 frames to get average interval (mitigate effect of latency)
  for (let i = 0; i < 50; i++) {
    let a = sample[i]
    let b = sample[i + 1]
    if (a && b) {
      const intvl = b.time - a.time
      numIntvls++
      totalIntvl += intvl
    }
  }

  // average samples above to determine interval between plot points (data rate)
  const intvl = totalIntvl / numIntvls

  // determine which points should be filtered based on max points per line
  const minMSInterval = dX / maxLinePoints

  let rendered = []

  // filter data points to exclude ones in the excluded time intervals
  for(let i = 0; i < sample.length; i++) {
    if(!rendered.length || i == sample.length - 1) {
      rendered.push(sample[i])
    } else {
      if ((sample[i].time - 1614799160000) %  minMSInterval < intvl) {
        rendered.push(sample[i])
      }
    }
  }

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
      for (let p = 0; p < frame.data.length && p < maxZones; p++) {
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
    min[prop] = Math.max(min[prop], 1)
    const r = max[prop] - min[prop]
    if(max[prop] < min[prop] + 1) {
      max[prop] = min[prop] + 1
    }
    const even = i => {
      min[prop] = -i + i * Math.ceil(min[prop] / i)
      max[prop] = i + i * Math.floor(max[prop] / i)
    }
    if(r <= 10) {
      max[prop] = 1 + Math.floor(max[prop])
      min[prop] = -1 + Math.ceil(min[prop])
    } else if(r <= 100) {
      even(10)
    } else if (r <= 1000) {
      even(100)
    } else if (r <= 10000) {
      even(1000)
    }
    
    autoScale[prop] = canvas.height / (max[prop] - min[prop])
  }


  // simplified lines for rendering
  let renderedLines = {}

  // track all rendered values per property
  let yValues = {}


  // loop through points and determine which ones are critical to geometry
  for(let prop of properties) {
    renderedLines[prop] = []
    yValues[prop] = {
      total: 0,
      totalPoints: 0
    }

    for(let i = 0; i < lines[prop].length; i++) {
      renderedLines[prop][i] = []

      for (let p = 0; p < lines[prop][i].length; p++) {
        let point = lines[prop][i][p]
        yValues[prop].total += point.y
        yValues[prop].totalPoints += 1
        point.y = parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop])
        renderedLines[prop][i].push(point)
      }
    }
  }

  const colors = {
    actual_temp: "#dd3300",
    actual_current: "#0033aa",
    actual_percent: "#33aabb"
  }

  // clear canvas for new frame
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let avg = {}

  let totalPoints = 0
  for(let prop of properties) {
    avg[prop] = yValues[prop].total / yValues[prop].totalPoints
    for(let i = 0; i < renderedLines[prop].length; i++) {
      const line = renderedLines[prop][i]
      totalPoints += line.length
      smooth(ctx, line, colors[prop], 2)
    }
  }

  logStats({ totalPoints, max, min, avg })
}

export default draw