export const colors = {
  1: '#A103FF',
  2: '#FF9C03',
  3: '#03CFFF',
  4: '#2E03FF'
}


export function smooth(ctx, points, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  // ctx.strokeRect(20, 20, 150, 100)

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
  for (var i = 0; i < points.length - 2; i++) {
    // ctx.lineTo(points[i].x, points[i].y)
    var xc = (points[i].x + points[i + 1].x) / 2
    var yc = (points[i].y + points[i + 1].y) / 2
    // ctx.lineTo(points[i].x, points[i].y)
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }
  ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
  ctx.stroke()
}

export const drawLines = (props, canvas, renderedLines) => {
  const ctx = canvas.getContext("2d")
  const lineColors = {
    [props[0]]: colors[1],
    [props[1]]: colors[2],
    [props[2]]: colors[3],
    [props[3]]: colors[4]
  }

  // clear canvas for new frame
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let prop of props) {
    if(renderedLines[prop]) {
      for (let i = 0; i < renderedLines[prop].length; i++) {
        const line = renderedLines[prop][i]
        smooth(ctx, line, lineColors[prop], 1)
      }
    }
  }
}