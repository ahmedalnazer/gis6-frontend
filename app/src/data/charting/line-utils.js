
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