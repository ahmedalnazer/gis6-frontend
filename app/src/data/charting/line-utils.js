export const colors = {
  1: '#A103FF',
  2: '#FF9C03',
  3: '#03CFFF',
  4: '#2E03FF'
}


export function smooth(ctx, points, color, width ) {
  ctx.strokeStyle = color
  ctx.lineWidth = width

  if(color) ctx.beginPath()
  if (points == undefined || points.length == 0 || points.length < 3) {
    return true
  }

  function gradient(a, b) {
    return (b.y - a.y) / (b.x - a.x)
  }

  function bzCurve(points, f = .5, t = 1) {
    //f = 0, will be straight line
    //t should generally be 1, but changing the value can control the smoothness too

    if(color) ctx.beginPath()
    if(color) ctx.moveTo(points[0].x, points[0].y)

    var m = 0
    var dx1 = 0
    var dy1 = 0
    let dx2 = 0
    let dy2 = 0

    var preP = points[0]
    for (var i = 1; i < points.length; i++) {
      var curP = points[i]

      // draw points for debugging

      // if(color) {
      //   ctx.fillStyle = color
      //   ctx.fillRect(curP.x - 4, curP.y - 4, 8, 8)
      // }

      const nexP = points[i + 1]
      if (nexP) {
        // flatten curves next to level y segments to avoid "horns" where the plot plateaus
        const modifier = nexP.y == curP.y || dy1 == 0 ? .05 : 1

        m = gradient(preP, nexP)
        dx2 = (nexP.x - curP.x) * -f * (dy1 == 0 ? .8 : 1)
        dy2 = dx2 * m * t * modifier
      } else {
        dx2 = 0
        dy2 = 0
      }
      ctx.bezierCurveTo(preP.x - dx1, preP.y - dy1, curP.x + dx2, curP.y + dy2, curP.x, curP.y)
      dx1 = dx2
      dy1 = dy2
      preP = curP
    }
    // ctx.stroke();
  }
  bzCurve(points)
  if(color) ctx.stroke()
}

const avg = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length



export const drawLines = (props, canvas, { renderedLines, selected, renderMode }) => {
  const ctx = canvas.getContext("2d")
  const lineColors = {
    [props[0]]: colors[1],
    [props[1]]: colors[2],
    [props[2]]: colors[3],
    [props[3]]: colors[4]
  }

  // clear canvas for new frame
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if(renderMode == 'minmax') {
    for(let prop of props) {
      const lines = renderedLines[prop]
      let minLine = []
      let maxLine = []
      let avgLine = []

      if(lines && lines[0] && lines[0].length) {
        for(let i = 0; i < lines[0].length; i++) {
          let min = 99999999
          let max = -9999999
          let x
          let values = []
          for(let l of lines) {
            const p = l[i]
            x = p.x
            values.push(p.y)
            min = p.y < min ? p.y : min
            max = p.y > max ? p.y : max
          }
          minLine.push({ x, y: min })
          maxLine.push({ x, y: max })
          avgLine.push({ x, y: avg(values) })
        }
        smooth(ctx, avgLine, lineColors[prop], 3)

        minLine.reverse()

        const region = new Path2D()
        ctx.moveTo(minLine[0].x, minLine[0].y)
        smooth(region, minLine)
        region.lineTo(maxLine[0].x, maxLine[0].y)
        smooth(region, maxLine)
        region.closePath()
        ctx.fillStyle = `${lineColors[prop]}33`
        ctx.fill(region, 'nonzero')
      }
    }
  } else {
    for (let prop of props) {
      if(renderedLines[prop]) {
        for (let i = 0; i < renderedLines[prop].length; i++) {
          const line = renderedLines[prop][i]
          smooth(ctx, line, lineColors[prop], i == selected ? 3 : 1)
        }
      }
    }
  }
}
