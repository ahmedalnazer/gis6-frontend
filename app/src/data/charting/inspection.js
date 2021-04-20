let n = 0

export const getInspectionDetails = (mode, zones, inspectPoint, rendered, canvas, xMin, timeRange, position) => {
  n += 1

  const [ xBase, yBase ] = inspectPoint

  const x = canvas.width * (xBase - xMin) / timeRange
  const y = position.panY - yBase / position.zoomY

  let data = {
    zone: -1,
    point: { x: -1, y: -1 },
    index: -1,
    pointIndex: -1
  }

  if(mode != 'inspect') return data

  let selectedDistance

  let stamp1, stamp2

  for(let [ property, lines ] of Object.entries(rendered)) {
    for(let line of lines) {

      // find closest x values on either side of inspected x
      if(!stamp1) {
        let last
        for (let point of line) {
          if(point.time > xBase && last) {
            stamp1 = last.x
            stamp2 = point.x
            data.pointIndex = line.indexOf(point)
            break
          }
          last = { ...point }
        }
      }
      
      const p1 = line.find(p => p.x == stamp1)
      const p2 = line.find(p => p.x == stamp2)

      if(p1 && p2) {
        // const totalYOffset = Math.abs(y - p1.y) + Math.abs(p2.y - y)
        
        const d = minDistance(p1, p2, { x, y })
        // log(d)
        if(d < selectedDistance || selectedDistance === undefined) {
          data.index = lines.indexOf(line)
          data.zone = zones[data.index]
          data.point = closest(p1, p2, { x, y })
          data.property = property
          selectedDistance = d
        }
      }
    }
  }
  // log(selectedZone)

  return data
}

const closest = (p1, p2, target) => {
  const dX1 = Math.abs(p1.x - target.x)
  const dX2 = Math.abs(p2.x - target.x)
  return dX1 > dX2 ? p2 : p1
}

// calculate distance of inspection point from line segment
const minDistance = (l1, l2, p) => {
  return Math.min(Math.hypot(l1.x - p.x, l1.y - p.y), Math.hypot(l2.x - p.x, l1.y - p.y))
  // const n = Math.abs((l2.x - l1.x) * (l1.y - p.y) - (l1.x - p.x) * (l2.y - l1.y))
  // const d = Math.sqrt(Math.pow(l2.x - l1.x, 2) + Math.pow(l2.y - l1.y, 2))
  // return n / d
}