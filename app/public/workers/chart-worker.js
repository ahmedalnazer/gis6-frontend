(function () {
  'use strict';

  let buffer$1 = {
    entries: [],
    active: [],
    paused: false
  };


  buffer$1.write = function(data) {
    // console.log('updating', data)
    buffer$1.entries = [ ...buffer$1.entries, ...data ].slice(-7500);
    buffer$1.entries.sort((a, b) => a.time - b.time);
    if(!buffer$1.paused) {
      buffer$1.active = [ ...buffer$1.entries ];
    }
  };
  buffer$1.reset = () => buffer$1.entries = [];
  buffer$1.play = () => buffer$1.paused = false;
  buffer$1.pause = () => buffer$1.paused = true;

  function smooth(ctx, points, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
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
    for (var i = 0; i < points.length - 2; i++) {
      // ctx.lineTo(points[i].x, points[i].y)
      var xc = (points[i].x + points[i + 1].x) / 2;
      var yc = (points[i].y + points[i + 1].y) / 2;
      // ctx.lineTo(points[i].x, points[i].y)
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    ctx.stroke();
  }

  const colors = {
    1: '#A103FF',
    2: '#FF9C03',
    3: '#03CFFF',
    4: '#2E03FF'
  };

  // properties which allow negative values
  const negatives = [ 'deviation' ];

  const getBit = (int, bit) => !!(int & 1 << bit);

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
    };
    return settings
  };



  const draw$1 = (chartData, logStats) => {
    const { canvas, ctx, scale, paused, zones, bufferParams, position } = chartData;

    const rate = bufferParams ? bufferParams.rate : 10;

    const _props = chartData.properties;
    const properties = _props.filter(x => !!x);

    let maxLinePoints = Math.min(700, Math.max(80, 20000 / (zones.length * properties.length)));

    // if(zones.length > 10) maxLinePoints = 60

    // if(zones.length > 50) maxLinePoints = 30

    // if(zones.length > 100) maxLinePoints = 10
    
    const latest = buffer$1.active[buffer$1.active.length - 1];


    const xZoomFactor = position.zoomX;
    let sRange = scale && scale.x ? parseInt(scale.x) : 10;

    if(isNaN(sRange)) sRange = 10;
    
    const xRange = sRange * 1000;

    let panXRatio = position.panX / canvas.width;
    let timeOffset = xRange * panXRatio;

    const delay = Math.max(1000, .01 * xRange);

    const now = new Date().getTime() - delay - timeOffset;
    let rawXMax = paused ? latest ? latest.time - delay * .25 - timeOffset : now : now;
    let rawXMin = rawXMax - xRange;

    let mid = rawXMin + xRange / 2;
    const scaled = xRange * xZoomFactor / 2;

    let xMax = mid + scaled;
    let xMin = mid - scaled;

    // console.log(mid, scaled, xMin, xMax)

    let renderLimit = xMin - 2000;
    let dX = xMax - xMin;

    // let sample = buffer.active.filter(x => x.time > renderLimit)

    let sample = [];

    for (let i = buffer$1.active.length; i >= 0; i--) {
      const frame = buffer$1.active[i];
      // console.log(frame && frame.time, renderLimit)
      if (frame) {
        if (frame.time >= renderLimit) {
          sample.unshift(frame);
        } else {
          break
        }
      }
    }

    const xScale = canvas.width / (xMax - xMin);

    // determine which points should be filtered based on max points per line
    const minMSInterval = dX / maxLinePoints;

    let rendered = [];

    // filter data points to exclude ones in the excluded time intervals
    for(let i = 0; i < sample.length; i++) {
      if(i == 0 || !rendered.length || i == sample.length - 1) {
        rendered.push(sample[i]);
      } else {
        if ((sample[i].time - 1614799160000) %  minMSInterval < 2000 / rate) {
          rendered.push(sample[i]);
        }
      }
    }

    // rendered.reverse()

    let lines = {};
    let max = {};
    let min = {};
    let autoScale = {};

    for (let prop of properties) {
      lines[prop] = [];
      max[prop] = 0;
      min[prop] = 99999999999999;
    }


    for(let i = 0; i < rendered.length; i++) {
      const frame = rendered[i];
      
      const x = (frame.time - xMin) * xScale;

      for (let z of zones) {
        const point = frame.data[z - 1];

        for (let prop of properties) {
          if (!lines[prop][z - 1]) lines[prop][z - 1] = [];
          let y = point[prop];
          if (prop == 'deviation') {
            getSettings(point);
            {
              y = point.temp_sp - point.actual_temp;
            }
          }
          lines[prop][z - 1].push({ x, y });
          if(x < xMax) {
            if (y > max[prop]) max[prop] = y;
            if (y < min[prop]) min[prop] = y;
          }
        }
      }
    }

    for(let prop of properties) {

      const scaleParams = scale.y && scale.y[prop];

      if(!negatives.includes(prop)) {
        min[prop] = Math.max(min[prop], 1);
      }

      const minAuto = scaleParams.min == 'auto';
      const maxAuto = scaleParams.max == 'auto';


      if (scaleParams) {
        if (!minAuto) min[prop] = scaleParams.min * 10;
        if (!maxAuto) max[prop] = scaleParams.max * 10;
      }

      const r = max[prop] - min[prop];

      if(scaleParams.max == 'auto' && scaleParams.min != 'auto') {
        max[prop] += r / 10;
      }
      if(scaleParams.min == 'auto' && scaleParams.max != 'auto') {
        min[prop] -= r / 10;
      }

      const scaleFactor = position.zoomY;

      const halfRange = (max[prop] - min[prop]) / 2;
      const midPoint = min[prop] + halfRange;
      min[prop] = midPoint - halfRange * scaleFactor;
      max[prop] = midPoint + halfRange * scaleFactor;
      // if (max[prop] < min[prop] + 10) {
      //   max[prop] = min[prop] + 10
      // }
      

      // ensure round numbers are used for the scale
      const even = i => {
        if(minAuto) min[prop] = -i + i * Math.ceil(min[prop] / i);
        if(maxAuto) max[prop] = i + i * Math.floor(max[prop] / i);
      };

      let matched = false;
      for(let x of [ 1, 10, 100, 200, 500, 1000, 2000, 5000, 10000 ]) {
        if(matched) break
        for(let y of [ 1, 2, 4, 8 ]) {
          const base = x * y;
          if(r < base) {
            even(base / 5);
            matched = true;
            break
          }
        }
      }

      if(!matched) {
        even(20000);
      }
      
      autoScale[prop] = canvas.height / (max[prop] - min[prop]);
    }


    // simplified lines for rendering
    let renderedLines = {};

    // track all rendered values per property
    let yValues = {};

    let totalPoints = 0;


    const offsetY = position.panY;

    // assign y values and prepare to calculate averages
    for(let prop of properties) {
      renderedLines[prop] = [];
      yValues[prop] = {
        total: 0,
        totalPoints: 0
      };

      for(let i = 0; i < lines[prop].length; i++) {
        if(lines[prop][i]) {
          renderedLines[prop][i] = [];

          for (let p = 0; p < lines[prop][i].length; p++) {
            let point = lines[prop][i][p];
            yValues[prop].total += point.y;
            yValues[prop].totalPoints += 1;
            point.y = offsetY + parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop]);
            renderedLines[prop][i].push(point);
            totalPoints++;
          }
        }
      }
    }


    const lineColors = {
      [_props[0]]: colors[1],
      [_props[1]]: colors[2],
      [_props[2]]: colors[3],
      [_props[3]]: colors[4]
    };

    // clear canvas for new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let avg = {};
    for(let prop of properties) {
      avg[prop] = yValues[prop].total / yValues[prop].totalPoints;
      for(let i = 0; i < renderedLines[prop].length; i++) {
        if(renderedLines[prop][i]) {
          const line = renderedLines[prop][i];
          smooth(ctx, line, lineColors[prop], 1);
        }
      }
    }

    if(totalPoints == 0) {
      for(let prop of properties) {
        min[prop] = 0;
        max[prop] = 0;
      }
    }

    logStats({ totalPoints, max, min, avg, plotFilled: sample.length < buffer$1.active.length, xMax, xMin });
  };

  const maxChunkSize = 100;

  let params = {
    rate: 10
  };

  let buffer = [];


  // ensure buffer is never filled faster than the specified rate
  const tryPush = (frame) => {
    frame.ts = frame.time.getTime();
    const lastFrame = buffer[buffer.length - 1];
    if(!lastFrame) {
      buffer.push(frame);
      return
    }
    // min interval is min ms between frames with 5ms padding
    const minIntvl = 1000 / params.rate + 5;
    if(frame.time - lastFrame.time >= minIntvl) {
      buffer.push(frame);
    }
  };

  buffer.write = function ({ ts, data }) {

    // simulate 450 zones
    // data = data.concat(data).concat(data)

    const date = new Date(ts);
    const frame = { data, date, time: ts };

    tryPush(frame);
    // tween(frame, 12)

    buffer = buffer.slice(-7500);
  };

  const renderers = {
    'line': draw$1
  };

  let chartData = {
    canvas: null,
    ctx: null,
    type: '',
    properties: [],
    scale: {
      x: 10,
      y: 'auto'
    }
  };

  let port;


  let stats = {};
  const logStats = s => stats = { ...stats, ...s };


  let renderTimes = [];

  let last = 0;
  const draw = () => {
    const t = new Date().getTime();
    if (chartData.ctx) {
      if (renderers[chartData.type]) {
        postMessage({ type: 'scale', value: { xMax: stats.xMax, xMin: stats.xMin, offsets: stats.offsets }});
        renderers[chartData.type](chartData, logStats);
        renderTimes.push(new Date().getTime() - last);
      }
    }
    last = t;
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);


  const collectStats = () => {
    const totalRender = renderTimes.reduce((t, total) => total + t, 0);
    const avgRender = totalRender / renderTimes.length;
    const framerate = Math.ceil(1000 / avgRender);
    renderTimes = renderTimes.slice(-50);

    stats = { ...stats, framerate };
    chartData.framerate = framerate;

    postMessage({ type: 'stats', value: stats });
  };

  setInterval(collectStats, 3 / 100);




  const initialize = async () => {
    port.onmessage = e => {
      const { data } = e;
      if(data == 'reset') {
        buffer$1.reset();
      } else {
        stats.bufferParams = data.params;
        chartData.bufferParams = data.params;
        if (data.update && data.update.length == maxChunkSize) {
          stats.loading = true;
        } else {
          stats.loading = false;
        }
        buffer$1.write(data.update);
      }
    };

    port.postMessage({ command: 'readBuffer' });
  };


  onmessage = e => {
    if (e.data.wsPort) {
      port = e.data.wsPort;
      initialize();
    } else if (e.data == 'close') {
      port.postMessage({ command: 'close' });
    } else {
      chartData = { ...chartData, ...e.data };
      // console.log('updating data', chartData)
      if (chartData.paused) {
        buffer$1.pause();
      } else {
        buffer$1.play();
      }
      if (e.data.canvas) {
        chartData.ctx = chartData.canvas.getContext("2d");
      }
    }
  };

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgc21vb3RoIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG5leHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cblxuXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgem9uZXMsIGJ1ZmZlclBhcmFtcywgcG9zaXRpb24gfSA9IGNoYXJ0RGF0YVxuXG4gIGNvbnN0IHJhdGUgPSBidWZmZXJQYXJhbXMgPyBidWZmZXJQYXJhbXMucmF0ZSA6IDEwXG5cbiAgY29uc3QgX3Byb3BzID0gY2hhcnREYXRhLnByb3BlcnRpZXNcbiAgY29uc3QgcHJvcGVydGllcyA9IF9wcm9wcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgbGV0IG1heExpbmVQb2ludHMgPSBNYXRoLm1pbig3MDAsIE1hdGgubWF4KDgwLCAyMDAwMCAvICh6b25lcy5sZW5ndGggKiBwcm9wZXJ0aWVzLmxlbmd0aCkpKVxuXG4gIC8vIGlmKHpvbmVzLmxlbmd0aCA+IDEwKSBtYXhMaW5lUG9pbnRzID0gNjBcblxuICAvLyBpZih6b25lcy5sZW5ndGggPiA1MCkgbWF4TGluZVBvaW50cyA9IDMwXG5cbiAgLy8gaWYoem9uZXMubGVuZ3RoID4gMTAwKSBtYXhMaW5lUG9pbnRzID0gMTBcbiAgXG4gIGNvbnN0IGxhdGVzdCA9IGJ1ZmZlci5hY3RpdmVbYnVmZmVyLmFjdGl2ZS5sZW5ndGggLSAxXVxuXG5cbiAgY29uc3QgeFpvb21GYWN0b3IgPSBwb3NpdGlvbi56b29tWFxuICBsZXQgc1JhbmdlID0gc2NhbGUgJiYgc2NhbGUueCA/IHBhcnNlSW50KHNjYWxlLngpIDogMTBcblxuICBpZihpc05hTihzUmFuZ2UpKSBzUmFuZ2UgPSAxMFxuICBcbiAgY29uc3QgeFJhbmdlID0gc1JhbmdlICogMTAwMFxuXG4gIGxldCBwYW5YUmF0aW8gPSBwb3NpdGlvbi5wYW5YIC8gY2FudmFzLndpZHRoXG4gIGxldCB0aW1lT2Zmc2V0ID0geFJhbmdlICogcGFuWFJhdGlvXG5cbiAgY29uc3QgZGVsYXkgPSBNYXRoLm1heCgxMDAwLCAuMDEgKiB4UmFuZ2UpXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheSAtIHRpbWVPZmZzZXRcbiAgbGV0IHJhd1hNYXggPSBwYXVzZWQgPyBsYXRlc3QgPyBsYXRlc3QudGltZSAtIGRlbGF5ICogLjI1IC0gdGltZU9mZnNldCA6IG5vdyA6IG5vd1xuICBsZXQgcmF3WE1pbiA9IHJhd1hNYXggLSB4UmFuZ2VcblxuICBsZXQgbWlkID0gcmF3WE1pbiArIHhSYW5nZSAvIDJcbiAgY29uc3Qgc2NhbGVkID0geFJhbmdlICogeFpvb21GYWN0b3IgLyAyXG5cbiAgbGV0IHhNYXggPSBtaWQgKyBzY2FsZWRcbiAgbGV0IHhNaW4gPSBtaWQgLSBzY2FsZWRcblxuICAvLyBjb25zb2xlLmxvZyhtaWQsIHNjYWxlZCwgeE1pbiwgeE1heClcblxuICBsZXQgcmVuZGVyTGltaXQgPSB4TWluIC0gMjAwMFxuICBsZXQgZFggPSB4TWF4IC0geE1pblxuXG4gIC8vIGxldCBzYW1wbGUgPSBidWZmZXIuYWN0aXZlLmZpbHRlcih4ID0+IHgudGltZSA+IHJlbmRlckxpbWl0KVxuXG4gIGxldCBzYW1wbGUgPSBbXVxuXG4gIGZvciAobGV0IGkgPSBidWZmZXIuYWN0aXZlLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBmcmFtZSA9IGJ1ZmZlci5hY3RpdmVbaV1cbiAgICAvLyBjb25zb2xlLmxvZyhmcmFtZSAmJiBmcmFtZS50aW1lLCByZW5kZXJMaW1pdClcbiAgICBpZiAoZnJhbWUpIHtcbiAgICAgIGlmIChmcmFtZS50aW1lID49IHJlbmRlckxpbWl0KSB7XG4gICAgICAgIHNhbXBsZS51bnNoaWZ0KGZyYW1lKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCB4U2NhbGUgPSBjYW52YXMud2lkdGggLyAoeE1heCAtIHhNaW4pXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgbGV0IHJlbmRlcmVkID0gW11cblxuICAvLyBmaWx0ZXIgZGF0YSBwb2ludHMgdG8gZXhjbHVkZSBvbmVzIGluIHRoZSBleGNsdWRlZCB0aW1lIGludGVydmFsc1xuICBmb3IobGV0IGkgPSAwOyBpIDwgc2FtcGxlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoaSA9PSAwIHx8ICFyZW5kZXJlZC5sZW5ndGggfHwgaSA9PSBzYW1wbGUubGVuZ3RoIC0gMSkge1xuICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgoc2FtcGxlW2ldLnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlICBtaW5NU0ludGVydmFsIDwgMjAwMCAvIHJhdGUpIHtcbiAgICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gIH1cblxuXG4gIGZvcihsZXQgaSA9IDA7IGkgPCByZW5kZXJlZC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaV1cbiAgICBcbiAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFsaW5lc1twcm9wXVt6IC0gMV0pIGxpbmVzW3Byb3BdW3ogLSAxXSA9IFtdXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSB9KVxuICAgICAgICBpZih4IDwgeE1heCkge1xuICAgICAgICAgIGlmICh5ID4gbWF4W3Byb3BdKSBtYXhbcHJvcF0gPSB5XG4gICAgICAgICAgaWYgKHkgPCBtaW5bcHJvcF0pIG1pbltwcm9wXSA9IHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG5cbiAgICBjb25zdCBzY2FsZVBhcmFtcyA9IHNjYWxlLnkgJiYgc2NhbGUueVtwcm9wXVxuXG4gICAgaWYoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgICAgbWluW3Byb3BdID0gTWF0aC5tYXgobWluW3Byb3BdLCAxKVxuICAgIH1cblxuICAgIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gICAgY29uc3QgbWF4QXV0byA9IHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bydcblxuXG4gICAgaWYgKHNjYWxlUGFyYW1zKSB7XG4gICAgICBpZiAoIW1pbkF1dG8pIG1pbltwcm9wXSA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gICAgICBpZiAoIW1heEF1dG8pIG1heFtwcm9wXSA9IHNjYWxlUGFyYW1zLm1heCAqIDEwXG4gICAgfVxuXG4gICAgY29uc3QgciA9IG1heFtwcm9wXSAtIG1pbltwcm9wXVxuXG4gICAgaWYoc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5taW4gIT0gJ2F1dG8nKSB7XG4gICAgICBtYXhbcHJvcF0gKz0gciAvIDEwXG4gICAgfVxuICAgIGlmKHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWF4ICE9ICdhdXRvJykge1xuICAgICAgbWluW3Byb3BdIC09IHIgLyAxMFxuICAgIH1cblxuICAgIGNvbnN0IHNjYWxlRmFjdG9yID0gcG9zaXRpb24uem9vbVlcblxuICAgIGNvbnN0IGhhbGZSYW5nZSA9IChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pIC8gMlxuICAgIGNvbnN0IG1pZFBvaW50ID0gbWluW3Byb3BdICsgaGFsZlJhbmdlXG4gICAgbWluW3Byb3BdID0gbWlkUG9pbnQgLSBoYWxmUmFuZ2UgKiBzY2FsZUZhY3RvclxuICAgIG1heFtwcm9wXSA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcbiAgICAvLyBpZiAobWF4W3Byb3BdIDwgbWluW3Byb3BdICsgMTApIHtcbiAgICAvLyAgIG1heFtwcm9wXSA9IG1pbltwcm9wXSArIDEwXG4gICAgLy8gfVxuICAgIFxuXG4gICAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICAgIGNvbnN0IGV2ZW4gPSBpID0+IHtcbiAgICAgIGlmKG1pbkF1dG8pIG1pbltwcm9wXSA9IC1pICsgaSAqIE1hdGguY2VpbChtaW5bcHJvcF0gLyBpKVxuICAgICAgaWYobWF4QXV0bykgbWF4W3Byb3BdID0gaSArIGkgKiBNYXRoLmZsb29yKG1heFtwcm9wXSAvIGkpXG4gICAgfVxuXG4gICAgbGV0IG1hdGNoZWQgPSBmYWxzZVxuICAgIGZvcihsZXQgeCBvZiBbIDEsIDEwLCAxMDAsIDIwMCwgNTAwLCAxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMCBdKSB7XG4gICAgICBpZihtYXRjaGVkKSBicmVha1xuICAgICAgZm9yKGxldCB5IG9mIFsgMSwgMiwgNCwgOCBdKSB7XG4gICAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgICBpZihyIDwgYmFzZSkge1xuICAgICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgICAgbWF0Y2hlZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoIW1hdGNoZWQpIHtcbiAgICAgIGV2ZW4oMjAwMDApXG4gICAgfVxuICAgIFxuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuICB9XG5cblxuICAvLyBzaW1wbGlmaWVkIGxpbmVzIGZvciByZW5kZXJpbmdcbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIC8vIHRyYWNrIGFsbCByZW5kZXJlZCB2YWx1ZXMgcGVyIHByb3BlcnR5XG4gIGxldCB5VmFsdWVzID0ge31cblxuICBsZXQgdG90YWxQb2ludHMgPSAwXG5cblxuICBjb25zdCBvZmZzZXRZID0gcG9zaXRpb24ucGFuWVxuXG4gIC8vIGFzc2lnbiB5IHZhbHVlcyBhbmQgcHJlcGFyZSB0byBjYWxjdWxhdGUgYXZlcmFnZXNcbiAgZm9yKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYobGluZXNbcHJvcF1baV0pIHtcbiAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXSA9IFtdXG5cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBsaW5lc1twcm9wXVtpXS5sZW5ndGg7IHArKykge1xuICAgICAgICAgIGxldCBwb2ludCA9IGxpbmVzW3Byb3BdW2ldW3BdXG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbCArPSBwb2ludC55XG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgICAgcG9pbnQueSA9IG9mZnNldFkgKyBwYXJzZUludChjYW52YXMuaGVpZ2h0IC0gKHBvaW50LnkgLSBtaW5bcHJvcF0pICogYXV0b1NjYWxlW3Byb3BdKVxuICAgICAgICAgIHJlbmRlcmVkTGluZXNbcHJvcF1baV0ucHVzaChwb2ludClcbiAgICAgICAgICB0b3RhbFBvaW50cysrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW19wcm9wc1swXV06IGNvbG9yc1sxXSxcbiAgICBbX3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtfcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW19wcm9wc1szXV06IGNvbG9yc1s0XVxuICB9XG5cbiAgLy8gY2xlYXIgY2FudmFzIGZvciBuZXcgZnJhbWVcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXG5cbiAgbGV0IGF2ZyA9IHt9XG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgYXZnW3Byb3BdID0geVZhbHVlc1twcm9wXS50b3RhbCAvIHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHNcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgcmVuZGVyZWRMaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXVtpXSkge1xuICAgICAgICBjb25zdCBsaW5lID0gcmVuZGVyZWRMaW5lc1twcm9wXVtpXVxuICAgICAgICBzbW9vdGgoY3R4LCBsaW5lLCBsaW5lQ29sb3JzW3Byb3BdLCAxKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKHRvdGFsUG9pbnRzID09IDApIHtcbiAgICBmb3IobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgICAgbWluW3Byb3BdID0gMFxuICAgICAgbWF4W3Byb3BdID0gMFxuICAgIH1cbiAgfVxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQ6IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aCwgeE1heCwgeE1pbiB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBkcmF3IiwiZXhwb3J0IGNvbnN0IG1heENodW5rU2l6ZSA9IDEwMFxuXG5sZXQgcGFyYW1zID0ge1xuICByYXRlOiAxMFxufVxuXG5sZXQgYnVmZmVyID0gW11cblxuXG4vLyBlbnN1cmUgYnVmZmVyIGlzIG5ldmVyIGZpbGxlZCBmYXN0ZXIgdGhhbiB0aGUgc3BlY2lmaWVkIHJhdGVcbmNvbnN0IHRyeVB1c2ggPSAoZnJhbWUpID0+IHtcbiAgZnJhbWUudHMgPSBmcmFtZS50aW1lLmdldFRpbWUoKVxuICBjb25zdCBsYXN0RnJhbWUgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG4gIGlmKCFsYXN0RnJhbWUpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgICByZXR1cm5cbiAgfVxuICAvLyBtaW4gaW50ZXJ2YWwgaXMgbWluIG1zIGJldHdlZW4gZnJhbWVzIHdpdGggNW1zIHBhZGRpbmdcbiAgY29uc3QgbWluSW50dmwgPSAxMDAwIC8gcGFyYW1zLnJhdGUgKyA1XG4gIGlmKGZyYW1lLnRpbWUgLSBsYXN0RnJhbWUudGltZSA+PSBtaW5JbnR2bCkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbiAoeyB0cywgZGF0YSB9KSB7XG5cbiAgLy8gc2ltdWxhdGUgNDUwIHpvbmVzXG4gIC8vIGRhdGEgPSBkYXRhLmNvbmNhdChkYXRhKS5jb25jYXQoZGF0YSlcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUodHMpXG4gIGNvbnN0IGZyYW1lID0geyBkYXRhLCBkYXRlLCB0aW1lOiB0cyB9XG5cbiAgdHJ5UHVzaChmcmFtZSlcbiAgLy8gdHdlZW4oZnJhbWUsIDEyKVxuXG4gIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgtNzUwMClcbn1cblxuXG5sZXQgaW50ZXJ2YWxzID0ge31cbmxldCBsYXRlc3QgPSB7fVxubGV0IGVhcmxpZXN0ID0ge31cbmxldCBuZWVkc1Jlc2V0ID0ge31cblxuZXhwb3J0IGNvbnN0IGJ1ZmZlckNvbW1hbmRzID0gKHBvcnQsIGUsIGlkKSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5cbmNvbnN0IHJlbmRlcmVycyA9IHtcbiAgJ2xpbmUnOiByZW5kZXJMaW5lXG59XG5cbmxldCBjaGFydERhdGEgPSB7XG4gIGNhbnZhczogbnVsbCxcbiAgY3R4OiBudWxsLFxuICB0eXBlOiAnJyxcbiAgcHJvcGVydGllczogW10sXG4gIHNjYWxlOiB7XG4gICAgeDogMTAsXG4gICAgeTogJ2F1dG8nXG4gIH1cbn1cblxubGV0IHBvcnRcblxuXG5sZXQgc3RhdHMgPSB7fVxuY29uc3QgbG9nU3RhdHMgPSBzID0+IHN0YXRzID0geyAuLi5zdGF0cywgLi4ucyB9XG5cblxubGV0IHJlbmRlclRpbWVzID0gW11cblxubGV0IGxhc3QgPSAwXG5jb25zdCBkcmF3ID0gKCkgPT4ge1xuICBjb25zdCB0ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgaWYgKGNoYXJ0RGF0YS5jdHgpIHtcbiAgICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc2NhbGUnLCB2YWx1ZTogeyB4TWF4OiBzdGF0cy54TWF4LCB4TWluOiBzdGF0cy54TWluLCBvZmZzZXRzOiBzdGF0cy5vZmZzZXRzIH19KVxuICAgICAgcmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXShjaGFydERhdGEsIGxvZ1N0YXRzKVxuICAgICAgcmVuZGVyVGltZXMucHVzaChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxhc3QpXG4gICAgfVxuICB9XG4gIGxhc3QgPSB0XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KVxufVxuXG5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdylcblxuXG5jb25zdCBjb2xsZWN0U3RhdHMgPSAoKSA9PiB7XG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLmNlaWwoMTAwMCAvIGF2Z1JlbmRlcilcbiAgcmVuZGVyVGltZXMgPSByZW5kZXJUaW1lcy5zbGljZSgtNTApXG5cbiAgc3RhdHMgPSB7IC4uLnN0YXRzLCBmcmFtZXJhdGUgfVxuICBjaGFydERhdGEuZnJhbWVyYXRlID0gZnJhbWVyYXRlXG5cbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RhdHMnLCB2YWx1ZTogc3RhdHMgfSlcbn1cblxuc2V0SW50ZXJ2YWwoY29sbGVjdFN0YXRzLCAzIC8gMTAwKVxuXG5cblxuXG5jb25zdCBpbml0aWFsaXplID0gYXN5bmMgKCkgPT4ge1xuICBwb3J0Lm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuICAgIGlmKGRhdGEgPT0gJ3Jlc2V0Jykge1xuICAgICAgYnVmZmVyLnJlc2V0KClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGNoYXJ0RGF0YS5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgaWYgKGRhdGEudXBkYXRlICYmIGRhdGEudXBkYXRlLmxlbmd0aCA9PSBtYXhDaHVua1NpemUpIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSBmYWxzZVxuICAgICAgfVxuICAgICAgYnVmZmVyLndyaXRlKGRhdGEudXBkYXRlKVxuICAgIH1cbiAgfVxuXG4gIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAncmVhZEJ1ZmZlcicgfSlcbn1cblxuXG5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgaWYgKGUuZGF0YS53c1BvcnQpIHtcbiAgICBwb3J0ID0gZS5kYXRhLndzUG9ydFxuICAgIGluaXRpYWxpemUoKVxuICB9IGVsc2UgaWYgKGUuZGF0YSA9PSAnY2xvc2UnKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjbG9zZScgfSlcbiAgfSBlbHNlIHtcbiAgICBjaGFydERhdGEgPSB7IC4uLmNoYXJ0RGF0YSwgLi4uZS5kYXRhIH1cbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgZGF0YScsIGNoYXJ0RGF0YSlcbiAgICBpZiAoY2hhcnREYXRhLnBhdXNlZCkge1xuICAgICAgYnVmZmVyLnBhdXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyLnBsYXkoKVxuICAgIH1cbiAgICBpZiAoZS5kYXRhLmNhbnZhcykge1xuICAgICAgY2hhcnREYXRhLmN0eCA9IGNoYXJ0RGF0YS5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gICAgfVxuICB9XG59Il0sIm5hbWVzIjpbImJ1ZmZlciIsImRyYXciLCJyZW5kZXJMaW5lIl0sIm1hcHBpbmdzIjoiOzs7RUFBQSxJQUFJQSxRQUFNLEdBQUc7RUFDYixFQUFFLE9BQU8sRUFBRSxFQUFFO0VBQ2IsRUFBRSxNQUFNLEVBQUUsRUFBRTtFQUNaLEVBQUUsTUFBTSxFQUFFLEtBQUs7RUFDZixFQUFDO0FBR0Q7QUFDQTtBQUNBQSxVQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQzlCO0VBQ0EsRUFBRUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDOUQsRUFBRUEsUUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNoRCxFQUFFLEdBQUcsQ0FBQ0EsUUFBTSxDQUFDLE1BQU0sRUFBRTtFQUNyQixJQUFJQSxRQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sR0FBRTtFQUN6QyxHQUFHO0VBQ0gsRUFBQztBQUNEQSxVQUFNLENBQUMsS0FBSyxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRTtBQUN4Q0EsVUFBTSxDQUFDLElBQUksR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHLE1BQUs7QUFDekNBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE1BQU0sR0FBRzs7RUNsQjlCLFNBQVMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtFQUNsRCxFQUFF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QyxFQUFFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxFQUFFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO0FBQzdGO0VBQ0E7QUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBO0VBQ0EsRUFBRSxNQUFNLE1BQU0sR0FBR0QsUUFBTSxDQUFDLE1BQU0sQ0FBQ0EsUUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0FBQ3hEO0FBQ0E7RUFDQSxFQUFFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxNQUFLO0VBQ3BDLEVBQUUsSUFBSSxNQUFNLEdBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFFO0FBQ3hEO0VBQ0EsRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEdBQUcsR0FBRTtFQUMvQjtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLEtBQUk7QUFDOUI7RUFDQSxFQUFFLElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQUs7RUFDOUMsRUFBRSxJQUFJLFVBQVUsR0FBRyxNQUFNLEdBQUcsVUFBUztBQUNyQztFQUNBLEVBQUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxHQUFHLE1BQU0sRUFBQztBQUM1QztFQUNBLEVBQUUsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLEdBQUcsV0FBVTtFQUN2RCxFQUFFLElBQUksT0FBTyxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBRztFQUNwRixFQUFFLElBQUksT0FBTyxHQUFHLE9BQU8sR0FBRyxPQUFNO0FBQ2hDO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxPQUFPLEdBQUcsTUFBTSxHQUFHLEVBQUM7RUFDaEMsRUFBRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsV0FBVyxHQUFHLEVBQUM7QUFDekM7RUFDQSxFQUFFLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxPQUFNO0VBQ3pCLEVBQUUsSUFBSSxJQUFJLEdBQUcsR0FBRyxHQUFHLE9BQU07QUFDekI7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLFdBQVcsR0FBRyxJQUFJLEdBQUcsS0FBSTtFQUMvQixFQUFFLElBQUksRUFBRSxHQUFHLElBQUksR0FBRyxLQUFJO0FBQ3RCO0VBQ0E7QUFDQTtFQUNBLEVBQUUsSUFBSSxNQUFNLEdBQUcsR0FBRTtBQUNqQjtFQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBR0EsUUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNsRCxJQUFJLE1BQU0sS0FBSyxHQUFHQSxRQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBQztFQUNsQztFQUNBLElBQUksSUFBSSxLQUFLLEVBQUU7RUFDZixNQUFNLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxXQUFXLEVBQUU7RUFDckMsUUFBUSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBQztFQUM3QixPQUFPLE1BQU07RUFDYixRQUFRLEtBQUs7RUFDYixPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxFQUFDO0FBQzdDO0VBQ0E7RUFDQSxFQUFFLE1BQU0sYUFBYSxHQUFHLEVBQUUsR0FBRyxjQUFhO0FBQzFDO0VBQ0EsRUFBRSxJQUFJLFFBQVEsR0FBRyxHQUFFO0FBQ25CO0VBQ0E7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7RUFDN0QsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBQztFQUM5QixLQUFLLE1BQU07RUFDWCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLGFBQWEsS0FBSyxhQUFhLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtFQUMzRSxRQUFRLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ2hDLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0E7QUFDQTtFQUNBLEVBQUUsSUFBSSxLQUFLLEdBQUcsR0FBRTtFQUNoQixFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksU0FBUyxHQUFHLEdBQUU7QUFDcEI7RUFDQSxFQUFFLEtBQUssSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQy9CLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUU7RUFDcEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNqQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFjO0VBQzlCLEdBQUc7QUFDSDtBQUNBO0VBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUMzQyxJQUFJLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUM7RUFDN0I7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksT0FBTTtBQUMxQztFQUNBLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUU7RUFDekIsTUFBTSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUM7QUFDckM7RUFDQSxNQUFNLEtBQUssSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQ25DLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFFO0VBQ3hELFFBQVEsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBQztFQUMzQixRQUFRLElBQUksSUFBSSxJQUFJLFdBQVcsRUFBRTtFQUNqQyxVQUEyQixXQUFXLENBQUMsS0FBSyxFQUFDO0VBQzdDLFVBRWlCO0VBQ2pCLFlBQVksQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLFlBQVc7RUFDakQsV0FBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFDO0VBQ3pDLFFBQVEsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFO0VBQ3JCLFVBQVUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQzFDLFVBQVUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQzFDLFNBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxJQUFJLElBQUksSUFBSSxVQUFVLEVBQUU7QUFDOUI7RUFDQSxJQUFJLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7QUFDaEQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQztFQUN4QyxLQUFLO0FBQ0w7RUFDQSxJQUFJLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLElBQUksT0FBTTtFQUM3QyxJQUFJLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLElBQUksT0FBTTtBQUM3QztBQUNBO0VBQ0EsSUFBSSxJQUFJLFdBQVcsRUFBRTtFQUNyQixNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsR0FBRTtFQUNwRCxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsR0FBRTtFQUNwRCxLQUFLO0FBQ0w7RUFDQSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFDO0FBQ25DO0VBQ0EsSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLElBQUksTUFBTSxJQUFJLFdBQVcsQ0FBQyxHQUFHLElBQUksTUFBTSxFQUFFO0VBQy9ELE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFFO0VBQ3pCLEtBQUs7RUFDTCxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLElBQUksV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLEVBQUU7RUFDL0QsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUU7RUFDekIsS0FBSztBQUNMO0VBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBSztBQUN0QztFQUNBLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDakQsSUFBSSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBUztFQUMxQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLEdBQUcsU0FBUyxHQUFHLFlBQVc7RUFDbEQsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLFNBQVMsR0FBRyxZQUFXO0VBQ2xEO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQTtFQUNBLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJO0VBQ3RCLE1BQU0sR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDL0QsTUFBTSxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDL0QsTUFBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLE9BQU8sR0FBRyxNQUFLO0VBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7RUFDcEUsTUFBTSxHQUFHLE9BQU8sRUFBRSxLQUFLO0VBQ3ZCLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ25DLFFBQVEsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDMUIsUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUU7RUFDckIsVUFBVSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBQztFQUN4QixVQUFVLE9BQU8sR0FBRyxLQUFJO0VBQ3hCLFVBQVUsS0FBSztFQUNmLFNBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztBQUNMO0VBQ0EsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFO0VBQ2pCLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBQztFQUNqQixLQUFLO0VBQ0w7RUFDQSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDN0QsR0FBRztBQUNIO0FBQ0E7RUFDQTtFQUNBLEVBQUUsSUFBSSxhQUFhLEdBQUcsR0FBRTtBQUN4QjtFQUNBO0VBQ0EsRUFBRSxJQUFJLE9BQU8sR0FBRyxHQUFFO0FBQ2xCO0VBQ0EsRUFBRSxJQUFJLFdBQVcsR0FBRyxFQUFDO0FBQ3JCO0FBQ0E7RUFDQSxFQUFFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFJO0FBQy9CO0VBQ0E7RUFDQSxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQzlCLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUU7RUFDNUIsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUc7RUFDcEIsTUFBTSxLQUFLLEVBQUUsQ0FBQztFQUNkLE1BQU0sV0FBVyxFQUFFLENBQUM7RUFDcEIsTUFBSztBQUNMO0VBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNoRCxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ3pCLFFBQVEsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUU7QUFDbkM7RUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3hELFVBQVUsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN2QyxVQUFVLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEVBQUM7RUFDeEMsVUFBVSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxJQUFJLEVBQUM7RUFDeEMsVUFBVSxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQztFQUMvRixVQUFVLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0VBQzVDLFVBQVUsV0FBVyxHQUFFO0VBQ3ZCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtBQUNBO0VBQ0EsRUFBRSxNQUFNLFVBQVUsR0FBRztFQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztFQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDMUIsSUFBRztBQUNIO0VBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDbEQ7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQzlCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVc7RUFDL0QsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN4RCxNQUFNLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQ2pDLFFBQVEsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMzQyxRQUFRLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDOUMsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLEdBQUcsV0FBVyxJQUFJLENBQUMsRUFBRTtFQUN2QixJQUFJLElBQUksSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQ2hDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDbkIsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNuQixLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUdBLFFBQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBQztFQUN4Rzs7RUMxUk8sTUFBTSxZQUFZLEdBQUcsSUFBRztBQUMvQjtFQUNBLElBQUksTUFBTSxHQUFHO0VBQ2IsRUFBRSxJQUFJLEVBQUUsRUFBRTtFQUNWLEVBQUM7QUFDRDtFQUNBLElBQUksTUFBTSxHQUFHLEdBQUU7QUFDZjtBQUNBO0VBQ0E7RUFDQSxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssS0FBSztFQUMzQixFQUFFLEtBQUssQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUU7RUFDakMsRUFBRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7RUFDN0MsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFO0VBQ2pCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDdEIsSUFBSSxNQUFNO0VBQ1YsR0FBRztFQUNIO0VBQ0EsRUFBRSxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxFQUFDO0VBQ3pDLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLElBQUksUUFBUSxFQUFFO0VBQzlDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDdEIsR0FBRztFQUNILEVBQUM7QUFHRDtFQUNBLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRTtBQUN2QztFQUNBO0VBQ0E7QUFDQTtFQUNBLEVBQUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFDO0VBQzNCLEVBQUUsTUFBTSxLQUFLLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUU7QUFDeEM7RUFDQSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUM7RUFDaEI7QUFDQTtFQUNBLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDOUI7O0VDakNBLE1BQU0sU0FBUyxHQUFHO0VBQ2xCLEVBQUUsTUFBTSxFQUFFRSxNQUFVO0VBQ3BCLEVBQUM7QUFDRDtFQUNBLElBQUksU0FBUyxHQUFHO0VBQ2hCLEVBQUUsTUFBTSxFQUFFLElBQUk7RUFDZCxFQUFFLEdBQUcsRUFBRSxJQUFJO0VBQ1gsRUFBRSxJQUFJLEVBQUUsRUFBRTtFQUNWLEVBQUUsVUFBVSxFQUFFLEVBQUU7RUFDaEIsRUFBRSxLQUFLLEVBQUU7RUFDVCxJQUFJLENBQUMsRUFBRSxFQUFFO0VBQ1QsSUFBSSxDQUFDLEVBQUUsTUFBTTtFQUNiLEdBQUc7RUFDSCxFQUFDO0FBQ0Q7RUFDQSxJQUFJLEtBQUk7QUFDUjtBQUNBO0VBQ0EsSUFBSSxLQUFLLEdBQUcsR0FBRTtFQUNkLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRTtBQUNoRDtBQUNBO0VBQ0EsSUFBSSxXQUFXLEdBQUcsR0FBRTtBQUNwQjtFQUNBLElBQUksSUFBSSxHQUFHLEVBQUM7RUFDWixNQUFNLElBQUksR0FBRyxNQUFNO0VBQ25CLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEdBQUU7RUFDaEMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUU7RUFDckIsSUFBSSxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDbkMsTUFBTSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBQztFQUMxRyxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBQztFQUNwRCxNQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEVBQUM7RUFDbkQsS0FBSztFQUNMLEdBQUc7RUFDSCxFQUFFLElBQUksR0FBRyxFQUFDO0VBQ1YsRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUM7RUFDN0IsRUFBQztBQUNEO0VBQ0EscUJBQXFCLENBQUMsSUFBSSxFQUFDO0FBQzNCO0FBQ0E7RUFDQSxNQUFNLFlBQVksR0FBRyxNQUFNO0VBQzNCLEVBQUUsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDcEUsRUFBRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU07RUFDcEQsRUFBRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUM7RUFDL0MsRUFBRSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBQztBQUN0QztFQUNBLEVBQUUsS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsU0FBUyxHQUFFO0VBQ2pDLEVBQUUsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFTO0FBQ2pDO0VBQ0EsRUFBRSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBQztFQUM5QyxFQUFDO0FBQ0Q7RUFDQSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUM7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7RUFDQSxNQUFNLFVBQVUsR0FBRyxZQUFZO0VBQy9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDeEIsSUFBSSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQztFQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUN4QixNQUFNRixRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU0sS0FBSyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTTtFQUN0QyxNQUFNLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDMUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksWUFBWSxFQUFFO0VBQzdELFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFJO0VBQzVCLE9BQU8sTUFBTTtFQUNiLFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFLO0VBQzdCLE9BQU87RUFDUCxNQUFNQSxRQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBQztFQUM3QyxFQUFDO0FBQ0Q7QUFDQTtFQUNBLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDakIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTTtFQUN4QixJQUFJLFVBQVUsR0FBRTtFQUNoQixHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUNoQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUM7RUFDMUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxTQUFTLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUU7RUFDM0M7RUFDQSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtFQUMxQixNQUFNQSxRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU1BLFFBQU0sQ0FBQyxJQUFJLEdBQUU7RUFDbkIsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN2QixNQUFNLFNBQVMsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDO0VBQ3ZELEtBQUs7RUFDTCxHQUFHO0VBQ0g7Ozs7OzsifQ==
