(function () {
  'use strict';

  let buffer = {
    entries: []
  };

  buffer.write = function(data) {
    // dummy testing
    data = data.concat(data).concat(data);
    buffer.entries.push({
      data,
      time: new Date()
    });
    buffer.entries = buffer.entries.slice(-7500);
    // console.log(buffer.entries.length)
  };

  function smooth(ctx, color, points) {
    ctx.strokeStyle = color;
    // ctx.strokeRect(20, 20, 150, 100)

    ctx.beginPath();
    if (points == undefined || points.length == 0) {
      return true
    }
    if (points.length == 1) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[0].x, points[0].y);
      return true
    }
    if (points.length == 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      return true
    }
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length - 2; i++) {
      // ctx.lineTo(points[i].x, points[i].y)
      var xc = (points[i].x + points[i + 1].x) / 2;
      var yc = (points[i].y + points[i + 1].y) / 2;
      // ctx.lineTo(points[i].x, points[i].y)
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    ctx.stroke();
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

  let chartData = {};


  const draw = () => {
    const { canvas, ctx, zoom } = chartData;

    // smooth(ctx, "#0000bb", [ 
    //   { x: 100, y: 200 }, { x: 200, y: 400 }, { x: 300, y: 800 }, { x: 400, y: 700 }, { x: 500, y: 900 },
    //   { x: 600, y: 200 }, { x: 700, y: 400 }, { x: 800, y: 800 }, { x: 900, y: 700 }, { x: 1000, y: 900 },
    // ])
    // return

    
    // console.log('rendering')
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // const xScaleFactor = canvas.width / (zoom && zoom.x || 1)

    let xMax = new Date().getTime();
    let xMin = new Date().getTime() - 10 * 1000;
    
    // initial values
    let tempMax = 0;
    let tempMin = 99999999;

    let ampMax = 0;
    let ampMin = 999999999;

    const xScale = canvas.width / (xMax - xMin);

    let temps = [];
    let currents = [];

    // console.log(buffer.entries.length)

    for(let i = 0; i < buffer.entries.length; i++) {
      const frame = buffer.entries[i];
      
      const x = (frame.time.getTime() - xMin) * xScale;
      // console.log(frame.data.length)

      if(x <= canvas.width) {
        for (let p = 0; p < frame.data.length; p++) {
          const point = frame.data[p];
          if (!temps[p] || !temps[p].length) {
            temps[p] = [];
            currents[p] = [];
          }

          let y = point.actual_temp;
          let y2 = point.actual_current;

          temps[p].push({ x, y });
          currents[p].push({ x, y: y2 });

          if (y > tempMax) tempMax = y;
          if (y < tempMin) tempMin = y;

          if (y2 > ampMax) ampMax = y2;
          if (y2 < ampMin) ampMin = y2;
        }
      }
    }

    const tempScale = canvas.height / (tempMax - tempMin);
    const ampScale = canvas.height / (ampMax - ampMin);

    for(let i = 0; i < temps.length; i++) {
      for(let p = 0; p < temps[i].length; p++) {
        temps[i][p].y = canvas.height - (temps[i][p].y - tempMin) * tempScale;
        currents[i][p].y = canvas.height - (currents[i][p].y - ampMin) * ampScale;
      }
    }

    // console.log(temps[0])

    for(let l of temps) {
      smooth(ctx, "#dd1100", l);
    }

    for(let l of currents) {
      smooth(ctx, "#0033aa", l);
    }
  };


  function renderLine(data) {
    chartData = data;
    console.time('render');
    draw();
    console.timeEnd('render');
  }

  console.log('chart worker intialized');

  const renderers = {
    'line': renderLine
  };

  let chartData$1 = {
    canvas: null,
    ctx: null,
    type: '',
    properties: []
  };

  let port;

  onmessage = e => {
    if(e.data.wsPort) {
      port = e.data.wsPort;
      initialize();
    } else if (e.data == 'close') {
      port.postMessage({ command: 'close' });
    } else {
      chartData$1 = e.data;
      if(e.data.canvas) {
        chartData$1.ctx = chartData$1.canvas.getContext("2d");
      }
    }
  };



  // setInterval(() => {
  //   // console.log(chartData.ctx, chartData.type)
  //   if(chartData.ctx) {
  //     if(renderers[chartData.type]) {
  //       // console.log('rendering')
  //       renderers[chartData.type](chartData)
  //     }
  //   }
  // }, 1000 / 30)

  const draw$1 = () => {
    if (chartData$1.ctx) {
      if (renderers[chartData$1.type]) {
        // console.log('rendering')
        renderers[chartData$1.type](chartData$1);
      }
    }
    requestAnimationFrame(draw$1);
  };

  requestAnimationFrame(draw$1);

  let lastBuffer;

  const initialize = async () => {
    port.onmessage = e => {

      // console.log(e)
      const { data } = e;
      const { mt } = data;
      if (mt == 6) {
        let { records } = data;
        records = records.slice(0, 50);
        // records = records.concat(records).concat(records)
        // console.log(records.length)
        if(lastBuffer) {
          // for(let x of [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]) {
          for(let x of [ 1, 3, 5, 7, 9, 11 ]) {
            let tween = [];
            for(let i = 0; i < records.length; i++) {
              const last = lastBuffer[i];
              const current = records[i];
              const tempDelta = (current.actual_temp - last.actual_temp) / 12;
              const powerDelta = (current.actual_current - last.actual_current) / 12;
              tween.push({
                ...current,
                actual_temp: last.actual_temp + tempDelta * x,
                actual_current: last.actual_current + powerDelta * x,
              });
            }
            // console.log(tween)
            setTimeout(() => buffer.write(tween), 500 / 12 * x);
          }
          setTimeout(() => buffer.write(records), 500);
          // buffer.write(lastBuffer)
          
        }
        lastBuffer = records;
        // buffer.write(data.records.slice(0,50))
        // for(let timeout of [ 100, 200, 300, 400 ]) {
        //   setTimeout(() => buffer.write(data.records), timeout)
        // }
        // console.log(data.records.length)
      }
    };

    port.postMessage({
      command: 'connect',
      channels: [ 'tczone' ]
    });
  };

}());
