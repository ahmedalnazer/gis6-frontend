import buffer from './buffer'
import { drawLines } from './line-utils'

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



// get the x axis bounds
const getXParameters = (position, canvas, scale, paused) => {
  const latest = buffer.active[buffer.active.length - 1]

  const xZoomFactor = position.zoomX
  // let sRange = scale && scale.x ? parseInt(scale.x) : 10
  let sRange = parseInt(scale.x)

  const xRange = sRange * 1000

  let panXRatio = position.panX / canvas.width
  let timeOffset = xRange * panXRatio

  const delay = Math.max(1000, .01 * xRange)

  const now = new Date().getTime() - delay - timeOffset
  let rawXMax = paused ? latest.time - delay * .25 - timeOffset : now
  let rawXMin = rawXMax - xRange

  let mid = rawXMin + xRange / 2
  const scaled = xRange * xZoomFactor / 2

  const xMax = mid + scaled
  const xMin = mid - scaled

  const dX = xMax - xMin
  const xScale = canvas.width / (xMax - xMin)

  return { xMin, xMax, xRange, dX, xScale }
}



// get the y axis bounds
const getYParameters = (prop, min, max, scaleParams, position) => {
  // console.log(min, max)
  if (!negatives.includes(prop)) {
    min = Math.max(min, 1)
  }

  const minAuto = scaleParams.min == 'auto'
  const maxAuto = scaleParams.max == 'auto'


  if (!minAuto) min = scaleParams.min * 10
  if (!maxAuto) max = scaleParams.max * 10

  const r = max - min

  if (scaleParams.max == 'auto' && scaleParams.min != 'auto') {
    max += r / 10
  }
  if (scaleParams.min == 'auto' && scaleParams.max != 'auto') {
    min -= r / 10
  }

  const scaleFactor = position.zoomY

  const halfRange = (max - min) / 2
  const midPoint = min + halfRange
  min = midPoint - halfRange * scaleFactor
  max = midPoint + halfRange * scaleFactor


  // ensure round numbers are used for the scale
  const even = i => {
    if (minAuto) min = -i + i * Math.ceil(min / i)
    if (maxAuto) max = i + i * Math.floor(max / i)
  }

  let matched = false
  for (let x of [ 1, 10, 100, 200, 500, 1000, 2000, 5000, 10000 ]) {
    if (matched) break
    for (let y of [ 1, 2, 4, 8 ]) {
      const base = x * y
      if (r < base) {
        even(base / 5)
        matched = true
        break
      }
    }
  }

  if (!matched) even(20000)

  return { minY: min, maxY: max }
}


/**
 * Generate canvas frame based on current buffer/config
 * @param {Object} chartData 
 * @param {Function} logStats 
 * @param {Function} submitLines 
 */
const draw = (chartData, logStats, submitLines) => {
  const { canvas, ctx, scale, paused, bufferParams, position } = chartData

  let { zones, jank } = chartData

  zones = zones.filter(x => !!x)

  // render multiple copies of each line for stress testing
  if(jank) {
    zones = zones.concat(zones).concat(zones).concat(zones)
    zones = zones.concat(zones).concat(zones).concat(zones)
  }

  const { rate } = bufferParams

  const _props = chartData.properties
  const properties = _props.filter(x => !!x)

  let maxLinePoints = Math.min(700, Math.max(80, 20000 / (zones.length * properties.length))) * (chartData.resolution / 4)
  
  const { xMin, xMax, dX, xScale } = getXParameters(position, canvas, scale, paused)

  const renderLimit = xMin - 2000
  const sample = buffer.active.filter(x => x.time >= renderLimit)

  // determine which points should be filtered based on max points per line
  const minMSInterval = dX / maxLinePoints

  const rendered = sample.filter(x => {
    const validTime = (x.time - 1614799160000) % minMSInterval < 2000 / rate
    return x == sample[0] || x == sample[sample.length - 1] || validTime
  })


  // rendered.reverse()

  let lines = {}
  let renderedLines = {}

  let max = {}
  let min = {}
  let avg = {}
  let autoScale = {}
  let yValues = {}
  let totalPoints = 0
  const offsetY = position.panY


  for (let prop of properties) {
    lines[prop] = []
    max[prop] = 0
    min[prop] = 99999999999999
    zones.forEach(x => lines[prop][x - 1] = [])


    // calculate x values in pixels, gather y axis data
    for (let frame of rendered) {
      const x = (frame.time - xMin) * xScale

      for (let z of zones) {
        const point = frame.data[z - 1]

        let y = point[prop]
        if (prop == 'deviation') {
          const settings = getSettings(point)
          if (settings.manual) {
            y = point.manual_sp - point.actual_percent
          } else {
            y = point.temp_sp - point.actual_temp
          }
        }
        lines[prop][z - 1].push({ x, y })
        max[prop] = Math.max(max[prop], y)
        min[prop] = Math.min(min[prop], y)
      }
    }


    const scaleParams = scale.y[prop]
    const { minY, maxY } = getYParameters(prop, min[prop], max[prop], scaleParams, position)

    min[prop] = minY
    max[prop] = maxY

    // establish pixel to unit ratio
    autoScale[prop] = canvas.height / (max[prop] - min[prop])


    renderedLines[prop] = []
    yValues[prop] = {
      total: 0,
      totalPoints: 0
    }

    // calculate y pixel values based on established scale
    for(let line of lines[prop].filter(x => !!x)) {
      let renderedLine = []
      
      for (let point of line) {
        yValues[prop].total += point.y
        yValues[prop].totalPoints += 1
        point.y = offsetY + parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop])
        renderedLine.push(point)
        totalPoints++
      }
      
      renderedLines[prop].push(renderedLine)
    }

    avg[prop] = yValues[prop].total / yValues[prop].totalPoints

    if(yValues[prop].totalPoints == 0) {
      min[prop] = 0
      max[prop] = 0
    }
  }


  if(canvas && ctx) {
    drawLines(_props, canvas, renderedLines)
  } else {
    submitLines(renderedLines)
  }

  logStats({ totalPoints, max, min, avg, plotFilled: sample.length < buffer.active.length, xMax, xMin })
}

export default draw