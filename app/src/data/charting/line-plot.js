import buffer from './buffer'
import { smooth } from './line-utils'

export const colors = {
  1: '#A103FF',
  2: '#FF9C03',
  3: '#03CFFF',
  4: '#2E03FF'
}

// properties which allow negative values
const negatives = [ 'deviation' ]

const getBit = (int, bit) => !!(int & 1 << bit)

const getSettings = (zone) => {
  let settings = {
    locked: getBit(zone.settings, 0),
    sealed: getBit(zone.settings, 1),
    on: getBit(zone.settings, 2),
    auto: getBit(zone.settings, 3),
    standby: getBit(zone.settings, 4),
    boost: getBit(zone.settings, 5),
    testing: getBit(zone.settings, 6),
    test_complete: getBit(zone.settings, 7)
  }
  return settings
}



const draw = (chartData, logStats) => {
  const { canvas, ctx, scale, paused, zones } = chartData

  const _props = chartData.properties
  const properties = _props.filter(x => !!x)

  let maxLinePoints = 80

  // if(zones.length > 10) maxLinePoints = 60

  // if(zones.length > 50) maxLinePoints = 30

  // if(zones.length > 100) maxLinePoints = 10
  
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
      for (let z of zones) {
        const point = frame.data[z - 1]

        for(let prop of properties) {
          if (!lines[prop][z - 1]) lines[prop][z - 1] = []
          let y = point[prop]
          if(prop == 'deviation') {
            const settings = getSettings(point)
            if(!settings.on) {
              y = 0
            } else if(settings.manual) {
              y = point.manual_sp - point.actual_percent
            } else {
              y = point.temp_sp - point.actual_temp
            }
          }
          lines[prop][z - 1].push({ x, y })
          if(y > max[prop]) max[prop] = y
          if(y < min[prop]) min[prop] = y
        }
      }
    }
  }

  for(let prop of properties) {
    if(!negatives.includes(prop)) {
      min[prop] = Math.max(min[prop], 1)
    }
    // if (max[prop] < min[prop] + 10) {
    //   max[prop] = min[prop] + 10
    // }
    const r = max[prop] - min[prop]

    // ensure round numbers are used for the scale
    const even = i => {
      min[prop] = -i + i * Math.ceil(min[prop] / i)
      max[prop] = i + i * Math.floor(max[prop] / i)
    }

    if(r <= 10) {
      even(2)
    } else if(r <= 100) {
      even(20)
    } else if (r <= 1000) {
      even(200)
    } else if (r <= 10000) {
      even(2000)
    } else {
      even(20000)
    }
    
    autoScale[prop] = canvas.height / (max[prop] - min[prop])
  }


  // simplified lines for rendering
  let renderedLines = {}

  // track all rendered values per property
  let yValues = {}

  let totalPoints = 0


  // loop through points and determine which ones are critical to geometry
  for(let prop of properties) {
    renderedLines[prop] = []
    yValues[prop] = {
      total: 0,
      totalPoints: 0
    }

    for(let i = 0; i < lines[prop].length; i++) {
      if(lines[prop][i]) {
        renderedLines[prop][i] = []

        for (let p = 0; p < lines[prop][i].length; p++) {
          let point = lines[prop][i][p]
          yValues[prop].total += point.y
          yValues[prop].totalPoints += 1
          point.y = parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop])
          renderedLines[prop][i].push(point)
          totalPoints++
        }
      }
    }
  }

  const lineColors = {
    [_props[0]]: colors[1],
    [_props[1]]: colors[2],
    [_props[2]]: colors[3],
    [_props[3]]: colors[4]
  }

  // clear canvas for new frame
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let avg = {}
  for(let prop of properties) {
    avg[prop] = yValues[prop].total / yValues[prop].totalPoints
    for(let i = 0; i < renderedLines[prop].length; i++) {
      if(renderedLines[prop][i]) {
        const line = renderedLines[prop][i]
        smooth(ctx, line, lineColors[prop], 2)
      }
    }
  }

  logStats({ totalPoints, max, min, avg })
}

export default draw