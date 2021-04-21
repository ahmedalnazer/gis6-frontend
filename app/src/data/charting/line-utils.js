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

  if(points.length < 3) return
  // ctx.moveTo(points[0].x, points[0].y)
  // for (var i = 0; i < points.length - 2; i++) {
  //   // ctx.lineTo(points[i].x, points[i].y)
  //   var xc = (points[i].x + points[i + 1].x) / 2
  //   var yc = (points[i].y + points[i + 1].y) / 2
  //   // ctx.lineTo(points[i].x, points[i].y)
  //   ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  // }
  // ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)

  function gradient(a, b) {
    return (b.y - a.y) / (b.x - a.x)
  }

  function bzCurve(points, f, t) {
    //f = 0, will be straight line
    //t suppose to be 1, but changing the value can control the smoothness too
    if (typeof f == 'undefined') f = 0.3
    if (typeof t == 'undefined') t = 0.6

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    var m = 0
    var dx1 = 0
    var dy1 = 0
    let dx2 = 0
    let dy2 = 0

    var preP = points[0]
    for (var i = 1; i < points.length; i++) {
      var curP = points[i]
      const nexP = points[i + 1]
      if (nexP) {
        m = gradient(preP, nexP)
        dx2 = (nexP.x - curP.x) * -f
        dy2 = dx2 * m * t
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
  bzCurve(points, .3, 1)
  ctx.stroke()
}



export const drawLines = (props, canvas, { renderedLines, selected }) => {
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
        smooth(ctx, line, lineColors[prop], i == selected ? 3 : 1)
      }
    }
  }
}