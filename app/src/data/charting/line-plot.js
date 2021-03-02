import buffer from './buffer'
import { smooth } from './line-utils'

let chartData = {}


const draw = () => {
  const { canvas, ctx, zoom } = chartData

  // smooth(ctx, "#0000bb", [ 
  //   { x: 100, y: 200 }, { x: 200, y: 400 }, { x: 300, y: 800 }, { x: 400, y: 700 }, { x: 500, y: 900 },
  //   { x: 600, y: 200 }, { x: 700, y: 400 }, { x: 800, y: 800 }, { x: 900, y: 700 }, { x: 1000, y: 900 },
  // ])
  // return

  
  // console.log('rendering')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // const xScaleFactor = canvas.width / (zoom && zoom.x || 1)

  let xMax = new Date().getTime()
  let xMin = new Date().getTime() - 10 * 1000
  
  // initial values
  let tempMax = 0
  let tempMin = 99999999

  let ampMax = 0
  let ampMin = 999999999

  const xScale = canvas.width / (xMax - xMin)

  let temps = []
  let currents = []

  // console.log(buffer.entries.length)

  for(let i = 0; i < buffer.entries.length; i++) {
    const frame = buffer.entries[i]
    
    const x = (frame.time.getTime() - xMin) * xScale
    // console.log(frame.data.length)

    if(x <= canvas.width) {
      for (let p = 0; p < frame.data.length; p++) {
        const point = frame.data[p]
        if (!temps[p] || !temps[p].length) {
          temps[p] = []
          currents[p] = []
        }

        let y = point.actual_temp
        let y2 = point.actual_current

        temps[p].push({ x, y })
        currents[p].push({ x, y: y2 })

        if (y > tempMax) tempMax = y
        if (y < tempMin) tempMin = y

        if (y2 > ampMax) ampMax = y2
        if (y2 < ampMin) ampMin = y2
      }
    }
  }

  const tempScale = canvas.height / (tempMax - tempMin)
  const ampScale = canvas.height / (ampMax - ampMin)

  for(let i = 0; i < temps.length; i++) {
    for(let p = 0; p < temps[i].length; p++) {
      temps[i][p].y = canvas.height - (temps[i][p].y - tempMin) * tempScale
      currents[i][p].y = canvas.height - (currents[i][p].y - ampMin) * ampScale
    }
  }

  // console.log(temps[0])

  for(let l of temps) {
    smooth(ctx, "#dd1100", l)
  }

  for(let l of currents) {
    smooth(ctx, "#0033aa", l)
  }
}


export default function renderLine(data) {
  chartData = data
  console.time('render')
  draw()
  console.timeEnd('render')
}