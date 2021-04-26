let n = 0

// rate limited logging
const log = (...args) => {
  if(n % 60 == 0) {
    console.log(...args)
    n = 0
  }
}


export const getInspectionDetails = (mode, zones, inspectPoint, rendered) => {
  n += 1

  const [ time, y ] = inspectPoint

  let data = {
    zone: -1,
    point: { x: -1, y: -1 },
    index: -1,
    pointIndex: -1
  }

  if(mode != 'inspect') return data

  let selectedDistance

  let stamps = []

  for(let [ property, lines ] of Object.entries(rendered)) {
    for(let line of lines) {

      // find closest x values on either side of inspected x
      if(!stamps[0]) {
        let minGap = 99999999999
        let closest
        for(let point of line) {
          const xOffset = Math.abs(point.time - time)
          if(xOffset < minGap) {
            closest = point
            minGap = xOffset
          } else {
            break
          }
        }
        const idx = line.indexOf(closest)
        for(let o of [ 1, 2, 3, 4 ]) {
          if(idx - o >= 0) {
            stamps.push(line[idx - o].x)
          }
          if(idx + o <= line.length - 1) {
            stamps.push(line[idx + o].x)
          }
        }
        // stamps.sort()
      }

      // find points for this line with x values matching the set determined above
      const points = stamps.map(stamp => line.find(p => p.x == stamp)).filter(x => !!x)

      if(points[0]) {
        // get min distance from points/segments and closest point
        const { distance, closest } = minDistance(points, { time, y })

        if(distance < selectedDistance || selectedDistance === undefined) {
          data.index = lines.indexOf(line)
          data.zone = zones[data.index]
          data.point = closest
          data.pointIndex = line.indexOf(closest)
          data.property = property
          selectedDistance = distance
        }
      }
    }
  }

  return data
}


// simple distance calculation between two points
const getDistance = (p1, p2) => {
  const a = p1.time - p2.time
  const b = p1.y - p2.y
  return Math.sqrt(a * a + b * b)
}


// get shortest distance between a line segment and a point
function getSegmentDistance(l1, l2, p) {
  const x = p.time
  const y = p.y
  const x1 = l1.time
  const y1 = l1.y
  const x2 = l2.time
  const y2 = l2.y

  var A = x - x1
  var B = y - y1
  var C = x2 - x1
  var D = y2 - y1

  var dot = A * C + B * D
  var len_sq = C * C + D * D
  var param = -1
  if (len_sq != 0) //in case of 0 length line
    param = dot / len_sq

  var xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  }
  else if (param > 1) {
    xx = x2
    yy = y2
  }
  else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  var dx = x - xx
  var dy = y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

// calculate distance of inspection point from points and/or line segments
const minDistance = (points, target) => {
  let closest
  let pointDistance = null
  let lineDistance = 999999999
  for(let i = 0; i < points.length; i++) {
    const point = points[i]
    const d = getDistance(point, target)
    if(pointDistance === null || d < pointDistance) {
      closest = point
      pointDistance = d
    }
    if(i > 0) {
      lineDistance = Math.min(lineDistance, getSegmentDistance(points[i], points[i - 1], target))
    }
  }
  return { closest, distance: Math.min(lineDistance, pointDistance) }
}
