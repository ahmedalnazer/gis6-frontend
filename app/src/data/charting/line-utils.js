
export function smooth(ctx, color, points) {
  ctx.strokeStyle = color
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
  for (var i = 1; i < points.length - 2; i++) {
    // ctx.lineTo(points[i].x, points[i].y)
    var xc = (points[i].x + points[i + 1].x) / 2
    var yc = (points[i].y + points[i + 1].y) / 2
    // ctx.lineTo(points[i].x, points[i].y)
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }
  ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
  ctx.stroke()
}

// export function smooth(ctx, color, points) {
//   ctx.beginPath()
//   ctx.strokeStyle = color
//   ctx.moveTo(points[0].x, points[0].y)

//   for (var i = 0; i < points.length - 1; i++) {
//     var x_mid = (points[i].x + points[i + 1].x) / 2
//     var y_mid = (points[i].y + points[i + 1].y) / 2
//     var cp_x1 = (x_mid + points[i].x) / 2
//     var cp_x2 = (x_mid + points[i + 1].x) / 2
//     ctx.quadraticCurveTo(cp_x1, points[i].y, x_mid, y_mid)
//     ctx.quadraticCurveTo(cp_x2, points[i + 1].y, points[i + 1].x, points[i + 1].y)
//     // ctx.lineTo(points[i].x, points[i].y)
//   }
//   ctx.stroke()
// }


// export function smooth(ctx, color, points) {
//   ctx.beginPath()
//   ctx.strokeStyle = color
//   if(points.length < 2) return
//   ctx.moveTo(points[0].x, points[0].y)
//   ctx.lineTo(points[1].x, points[1].y)

//   if(points.length > 3) {
//     for (var i = 1; i < points.length - 2; i++) {
//       let x0 = points[i - 1].x
//       let x = points[i].x
//       let x1 = points[i + 1].x
//       let x2 = points[i + 2].x

//       let y0 = points[i - 1].y
//       let y = points[i].y
//       let y1 = points[i + 1].y
//       let y2 = points[i + 2].y

//       const dX = x - x0
//       const dY = y - y0

//       const deltY = y1 - y
//       const deltX = x1 - x

//       const d2X = x2 - x1
//       const d2Y = y2 - y1

//       // const c1x = x + maxX
//       // const c1x = x + (x1 - x) * (dY / dX)
//       // const c2x = x1 + (x2 - x0) * (d2Y / d2X)

//       const c1x = Math.max(x + deltX / 2, x1)
//       const c2x = Math.min(x1 - deltX / 2, x)
//       const c1y = Math.max(y + deltY / 2, y1)
//       const c2y = Math.min(y1 - deltY / 2, y)

//       // console.log([ x0, y0 ], [ x, y ], [ c1x, y1 ], [ c2x, y ])

//       // const c2x = x1 - maxX
//       // const c2y = y1 - Math.max(maxY, d2Y)

//       ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1)
//     }
//   }

  

//   // for (var i = 0; i < points.length - 1; i++) {
//   //   var x_mid = (points[i].x + points[i + 1].x) / 2
//   //   var y_mid = (points[i].y + points[i + 1].y) / 2
//   //   var cp_x1 = (x_mid + points[i].x) / 2
//   //   var cp_x2 = (x_mid + points[i + 1].x) / 2
//   //   ctx.quadraticCurveTo(cp_x1, points[i].y, x_mid, y_mid)
//   //   ctx.quadraticCurveTo(cp_x2, points[i + 1].y, points[i + 1].x, points[i + 1].y)
//   //   // ctx.lineTo(points[i].x, points[i].y)
//   // }
//   ctx.stroke()
// }