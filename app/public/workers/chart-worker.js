(function () {
  'use strict';

  let buffer$1 = {
    entries: [],
    active: [],
    paused: false
  };


  buffer$1.write = function(data) {
    // console.log('updating', data)
    buffer$1.entries = [ ...buffer$1.entries, ...data ].filter(x => !!x).slice(-7500);
    buffer$1.entries.sort((a, b) => a.time - b.time);
    if(!buffer$1.paused) {
      buffer$1.active = [ ...buffer$1.entries ];
    }
  };
  buffer$1.reset = () => buffer$1.entries = [];
  buffer$1.play = () => buffer$1.paused = false;
  buffer$1.pause = () => buffer$1.paused = true;

  const colors = {
    1: '#A103FF',
    2: '#FF9C03',
    3: '#03CFFF',
    4: '#2E03FF'
  };


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

  const drawLines = (props, canvas, renderedLines) => {
    const ctx = canvas.getContext("2d");
    const lineColors = {
      [props[0]]: colors[1],
      [props[1]]: colors[2],
      [props[2]]: colors[3],
      [props[3]]: colors[4]
    };

    // clear canvas for new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let prop of props) {
      if(renderedLines[prop]) {
        for (let i = 0; i < renderedLines[prop].length; i++) {
          const line = renderedLines[prop][i];
          smooth(ctx, line, lineColors[prop], 1);
        }
      }
    }
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



  // get the x axis bounds
  const getXParameters = (position, canvas, scale, paused) => {
    const latest = buffer$1.active[buffer$1.active.length - 1];
    if(!latest) return { valid: false }

    const xZoomFactor = position.zoomX;
    // let sRange = scale && scale.x ? parseInt(scale.x) : 10
    let sRange = parseInt(scale.x);

    const xRange = sRange * 1000;

    let panXRatio = position.panX / canvas.width;
    let timeOffset = xRange * panXRatio;

    const delay = Math.max(1000, .01 * xRange);

    const now = new Date().getTime() - delay - timeOffset;
    let rawXMax = paused ? latest.time - delay * .25 - timeOffset : now;
    let rawXMin = rawXMax - xRange;

    let mid = rawXMin + xRange / 2;
    const scaled = xRange * xZoomFactor / 2;

    const xMax = mid + scaled;
    const xMin = mid - scaled;

    const dX = xMax - xMin;
    const xScale = canvas.width / (xMax - xMin);

    return { xMin, xMax, xRange, dX, xScale, valid: true }
  };



  // get the y axis bounds
  const getYParameters = (prop, min, max, scaleParams, position) => {
    // console.log(min, max)
    if (!negatives.includes(prop)) {
      min = Math.max(min, 0);
    }

    const minAuto = scaleParams.min == 'auto';
    const maxAuto = scaleParams.max == 'auto';


    if (!minAuto) min = scaleParams.min * 10;
    if (!maxAuto) max = scaleParams.max * 10;

    const r = max - min;

    if (scaleParams.max == 'auto' && scaleParams.min != 'auto') {
      max += r / 10;
    }
    if (scaleParams.min == 'auto' && scaleParams.max != 'auto') {
      min -= r / 10;
    }

    const scaleFactor = position.zoomY;

    const halfRange = (max - min) / 2;
    const midPoint = min + halfRange;
    min = midPoint - halfRange * scaleFactor;
    max = midPoint + halfRange * scaleFactor;

    // ensure round numbers are used for the scale
    const even = i => {
      if (minAuto) min = -i + i * Math.ceil(min / i);
      if (maxAuto) max = i + i * Math.floor(max / i);
    };

    

    let matched = false;
    for (let x of [ 10, 100, 200, 500, 1000, 2000, 5000, 10000 ]) {
      if (matched) break
      for (let y of [ 1, 2, 4, 8 ]) {
        const base = x * y;
        if (r < base) {
          even(base / 5);
          matched = true;
          break
        }
      }
    }

    if (!matched) even(20000);

    return { minY: min, maxY: max }
  };


  /**
   * Generate canvas frame based on current buffer/config
   * @param {Object} chartData 
   * @param {Function} logStats 
   * @param {Function} submitLines 
   */
  const draw$1 = (chartData, logStats, submitLines) => {
    const { canvas, ctx, scale, paused, bufferParams, position } = chartData;

    let { zones, jank } = chartData;

    zones = zones.filter(x => !!x);

    // render multiple copies of each line for stress testing
    if(jank) {
      zones = zones.concat(zones).concat(zones).concat(zones);
      zones = zones.concat(zones).concat(zones).concat(zones);
    }

    const { rate } = bufferParams;

    const _props = chartData.properties;
    const properties = _props.filter(x => !!x);

    let maxLinePoints = Math.min(700, Math.max(80, 20000 / (zones.length * properties.length))) * (chartData.resolution / 4);
    
    const { xMin, xMax, dX, xScale, valid } = getXParameters(position, canvas, scale, paused);
    if(!valid) return

    const renderLimit = xMin - 2000;
    const sample = buffer$1.active.filter(x => x.time >= renderLimit);

    // determine which points should be filtered based on max points per line
    const minMSInterval = dX / maxLinePoints;

    const rendered = sample.filter(x => {
      const validTime = (x.time - 1614799160000) % minMSInterval < 2000 / rate;
      return x == sample[0] || x == sample[sample.length - 1] || validTime
    });


    // rendered.reverse()

    let lines = {};
    let renderedLines = {};

    let max = {};
    let min = {};
    let avg = {};
    let autoScale = {};
    let yValues = {};
    let totalPoints = 0;
    const offsetY = position.panY;


    for (let prop of properties) {
      lines[prop] = [];
      max[prop] = 0;
      min[prop] = 99999999999999;
      zones.forEach(x => lines[prop][x - 1] = []);


      // calculate x values in pixels, gather y axis data
      for (let frame of rendered) {
        const x = (frame.time - xMin) * xScale;

        for (let z of zones) {
          const point = frame.data[z - 1];

          let y = point[prop];
          if (prop == 'deviation') {
            getSettings(point);
            {
              y = point.temp_sp - point.actual_temp;
            }
          }
          lines[prop][z - 1].push({ x, y });
          max[prop] = Math.max(max[prop], y);
          min[prop] = Math.min(min[prop], y);
        }
      }


      const scaleParams = scale.y[prop];
      const { minY, maxY } = getYParameters(prop, min[prop], max[prop], scaleParams, position);

      min[prop] = minY;
      max[prop] = maxY;

      // establish pixel to unit ratio
      autoScale[prop] = canvas.height / (max[prop] - min[prop]);


      renderedLines[prop] = [];
      yValues[prop] = {
        total: 0,
        totalPoints: 0
      };

      // calculate y pixel values based on established scale
      for(let line of lines[prop].filter(x => !!x)) {
        let renderedLine = [];
        
        for (let point of line) {
          yValues[prop].total += point.y;
          yValues[prop].totalPoints += 1;
          point.y = offsetY + parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop]);
          renderedLine.push(point);
          totalPoints++;
        }
        
        renderedLines[prop].push(renderedLine);
      }

      avg[prop] = yValues[prop].total / yValues[prop].totalPoints;

      if(yValues[prop].totalPoints == 0) {
        min[prop] = 0;
        max[prop] = 0;
      }
    }


    if(canvas && ctx) {
      drawLines(_props, canvas, renderedLines);
    } else {
      submitLines(renderedLines);
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

  let requestAnimFrame;
  try {
    requestAnimFrame = requestAnimationFrame;
  } catch(e) {
    try {
      requestAnimFrame = webkitRequestAnimationFrame;
    } catch(e) {
      try {
        requestAnimFrame = mozRequestAnimationFrame;
      } catch(e) {
        requestAnimFrame = function (/* function */ callback, /* DOMElement */ element) {
          setTimeout(callback, 1000 / 60);
        };
      }
    }
  }


  let refreshRate = 60;

  // get refresh rate for current display
  const getRefreshRate = async (frames = 60) => {
    return new Promise((resolve, reject) => {
      let last;
      const times = [];
      const getTime = n => {
        const now = new Date().getTime();
        if(last) times.push(now - last);
        last = now;

        if(n == 0) {
          const total = times.reduce((total, t) => total + t, 0);
          const avg = total / times.length;
          resolve(1000 / avg);
        } else {
          requestAnimFrame(() => getTime(n - 1));
        }
      };
      getTime(frames);
    })
  };

  getRefreshRate(1000).then(rate => {
    if(rate < 40) {
      refreshRate = 30;
    }
    // console.log(refreshRate)
  });


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
    },
    bufferParams: {
      rate: 10
    },
    // current datapoint density setting (1 - 4)
    resolution: 4
  };

  let port;


  let stats = {};
  const logStats = s => stats = { ...stats, ...s };

  // most recent set of render times (to determine frame rate)
  let renderTimes = [];

  // framerate snapshots to monitor system strain
  let performanceHistory = [];

  // track most recent 
  let lastResolutionChange = new Date().getTime();

  // track number of times max Resolution recommended
  let maxResCount = 0;



  let last = 0;
  const draw = () => {
    const t = new Date().getTime();
    if (renderers[chartData.type]) {
      postMessage({ type: 'scale', value: { xMax: stats.xMax, xMin: stats.xMin, offsets: stats.offsets }});
      renderers[chartData.type](chartData, logStats, submitLines);
      renderTimes.push(new Date().getTime() - last);
    }
    last = t;
    requestAnimFrame(draw);
  };

  requestAnimFrame(draw);

  const submitLines = lines => {
    postMessage({ type: 'lines', lines });
  };

  const collectStats = () => {
    const now = new Date().getTime();

    const totalRender = renderTimes.reduce((t, total) => total + t, 0);
    const avgRender = totalRender / renderTimes.length;
    const framerate = Math.ceil(1000 / avgRender);
    performanceHistory.push(framerate);

    // keep last 10s of framerate data for performance monitoring
    performanceHistory = performanceHistory.slice(-30);

    // truncate frame data to keep a rolling average
    renderTimes = renderTimes.slice(-60);

    // if enough time has passed, calculate recommended resolution
    if(now - lastResolutionChange > 1000) {
      lastResolutionChange = now;

      const recommended = Math.ceil((framerate - 15) * 4 / (refreshRate - 15));

      if(recommended > 3 && chartData.resolution == 3) {
        if(maxResCount > 3) {
          chartData.resolution = 4;
        } else {
          maxResCount += 1;
        }
      } else {
        maxResCount = 0;

        // ensure we're aiming for recommended +/- 1
        if (recommended - 1 > chartData.resolution) {
          chartData.resolution += 1;
        } else if (recommended + 1 < chartData.resolution) {
          chartData.resolution -= 1;
        }
      }

      // clamp at 1 - 4
      chartData.resolution = Math.max(1, Math.min(chartData.resolution, 4));

      stats.resolution = chartData.resolution;
    }

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
      if (e.data.canvas && e.data.canvas.getContext) {
        chartData.ctx = chartData.canvas.getContext("2d");
      }
    }
  };

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uZmlsdGVyKHggPT4gISF4KS5zbGljZSgtNzUwMClcbiAgYnVmZmVyLmVudHJpZXMuc29ydCgoYSwgYikgPT4gYS50aW1lIC0gYi50aW1lKVxuICBpZighYnVmZmVyLnBhdXNlZCkge1xuICAgIGJ1ZmZlci5hY3RpdmUgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzIF1cbiAgfVxufVxuYnVmZmVyLnJlc2V0ID0gKCkgPT4gYnVmZmVyLmVudHJpZXMgPSBbXVxuYnVmZmVyLnBsYXkgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gZmFsc2VcbmJ1ZmZlci5wYXVzZSA9ICgpID0+IGJ1ZmZlci5wYXVzZWQgPSB0cnVlXG4iLCJleHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn1cblxuZXhwb3J0IGNvbnN0IGRyYXdMaW5lcyA9IChwcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICBpZihyZW5kZXJlZExpbmVzW3Byb3BdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IHJlbmRlcmVkTGluZXNbcHJvcF1baV1cbiAgICAgICAgc21vb3RoKGN0eCwgbGluZSwgbGluZUNvbG9yc1twcm9wXSwgMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG4vLyBwcm9wZXJ0aWVzIHdoaWNoIGFsbG93IG5lZ2F0aXZlIHZhbHVlc1xuY29uc3QgbmVnYXRpdmVzID0gWyAnZGV2aWF0aW9uJyBdXG5cbmNvbnN0IGdldEJpdCA9IChpbnQsIGJpdCkgPT4gISEoaW50ICYgMSA8PCBiaXQpXG5cbmNvbnN0IGdldFNldHRpbmdzID0gKHpvbmUpID0+IHtcbiAgbGV0IHNldHRpbmdzID0ge1xuICAgIGxvY2tlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDApLFxuICAgIHNlYWxlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDEpLFxuICAgIG9uOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMiksXG4gICAgYXV0bzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDMpLFxuICAgIHN0YW5kYnk6IGdldEJpdCh6b25lLnNldHRpbmdzLCA0KSxcbiAgICBib29zdDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDUpLFxuICAgIHRlc3Rpbmc6IGdldEJpdCh6b25lLnNldHRpbmdzLCA2KSxcbiAgICB0ZXN0X2NvbXBsZXRlOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNylcbiAgfVxuICByZXR1cm4gc2V0dGluZ3Ncbn1cblxuXG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCkgPT4ge1xuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cbiAgaWYoIWxhdGVzdCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIC4wMSAqIHhSYW5nZSlcblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRlbGF5IC0gdGltZU9mZnNldFxuICBsZXQgcmF3WE1heCA9IHBhdXNlZCA/IGxhdGVzdC50aW1lIC0gZGVsYXkgKiAuMjUgLSB0aW1lT2Zmc2V0IDogbm93XG4gIGxldCByYXdYTWluID0gcmF3WE1heCAtIHhSYW5nZVxuXG4gIGxldCBtaWQgPSByYXdYTWluICsgeFJhbmdlIC8gMlxuICBjb25zdCBzY2FsZWQgPSB4UmFuZ2UgKiB4Wm9vbUZhY3RvciAvIDJcblxuICBjb25zdCB4TWF4ID0gbWlkICsgc2NhbGVkXG4gIGNvbnN0IHhNaW4gPSBtaWQgLSBzY2FsZWRcblxuICBjb25zdCBkWCA9IHhNYXggLSB4TWluXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICByZXR1cm4geyB4TWluLCB4TWF4LCB4UmFuZ2UsIGRYLCB4U2NhbGUsIHZhbGlkOiB0cnVlIH1cbn1cblxuXG5cbi8vIGdldCB0aGUgeSBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WVBhcmFtZXRlcnMgPSAocHJvcCwgbWluLCBtYXgsIHNjYWxlUGFyYW1zLCBwb3NpdGlvbikgPT4ge1xuICAvLyBjb25zb2xlLmxvZyhtaW4sIG1heClcbiAgaWYgKCFuZWdhdGl2ZXMuaW5jbHVkZXMocHJvcCkpIHtcbiAgICBtaW4gPSBNYXRoLm1heChtaW4sIDApXG4gIH1cblxuICBjb25zdCBtaW5BdXRvID0gc2NhbGVQYXJhbXMubWluID09ICdhdXRvJ1xuICBjb25zdCBtYXhBdXRvID0gc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJ1xuXG5cbiAgaWYgKCFtaW5BdXRvKSBtaW4gPSBzY2FsZVBhcmFtcy5taW4gKiAxMFxuICBpZiAoIW1heEF1dG8pIG1heCA9IHNjYWxlUGFyYW1zLm1heCAqIDEwXG5cbiAgY29uc3QgciA9IG1heCAtIG1pblxuXG4gIGlmIChzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nICYmIHNjYWxlUGFyYW1zLm1pbiAhPSAnYXV0bycpIHtcbiAgICBtYXggKz0gciAvIDEwXG4gIH1cbiAgaWYgKHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWF4ICE9ICdhdXRvJykge1xuICAgIG1pbiAtPSByIC8gMTBcbiAgfVxuXG4gIGNvbnN0IHNjYWxlRmFjdG9yID0gcG9zaXRpb24uem9vbVlcblxuICBjb25zdCBoYWxmUmFuZ2UgPSAobWF4IC0gbWluKSAvIDJcbiAgY29uc3QgbWlkUG9pbnQgPSBtaW4gKyBoYWxmUmFuZ2VcbiAgbWluID0gbWlkUG9pbnQgLSBoYWxmUmFuZ2UgKiBzY2FsZUZhY3RvclxuICBtYXggPSBtaWRQb2ludCArIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG5cbiAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICBjb25zdCBldmVuID0gaSA9PiB7XG4gICAgaWYgKG1pbkF1dG8pIG1pbiA9IC1pICsgaSAqIE1hdGguY2VpbChtaW4gLyBpKVxuICAgIGlmIChtYXhBdXRvKSBtYXggPSBpICsgaSAqIE1hdGguZmxvb3IobWF4IC8gaSlcbiAgfVxuXG4gIFxuXG4gIGxldCBtYXRjaGVkID0gZmFsc2VcbiAgZm9yIChsZXQgeCBvZiBbIDEwLCAxMDAsIDIwMCwgNTAwLCAxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMCBdKSB7XG4gICAgaWYgKG1hdGNoZWQpIGJyZWFrXG4gICAgZm9yIChsZXQgeSBvZiBbIDEsIDIsIDQsIDggXSkge1xuICAgICAgY29uc3QgYmFzZSA9IHggKiB5XG4gICAgICBpZiAociA8IGJhc2UpIHtcbiAgICAgICAgZXZlbihiYXNlIC8gNSlcbiAgICAgICAgbWF0Y2hlZCA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIW1hdGNoZWQpIGV2ZW4oMjAwMDApXG5cbiAgcmV0dXJuIHsgbWluWTogbWluLCBtYXhZOiBtYXggfVxufVxuXG5cbi8qKlxuICogR2VuZXJhdGUgY2FudmFzIGZyYW1lIGJhc2VkIG9uIGN1cnJlbnQgYnVmZmVyL2NvbmZpZ1xuICogQHBhcmFtIHtPYmplY3R9IGNoYXJ0RGF0YSBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxvZ1N0YXRzIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gc3VibWl0TGluZXMgXG4gKi9cbmNvbnN0IGRyYXcgPSAoY2hhcnREYXRhLCBsb2dTdGF0cywgc3VibWl0TGluZXMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zLCBwb3NpdGlvbiB9ID0gY2hhcnREYXRhXG5cbiAgbGV0IHsgem9uZXMsIGphbmsgfSA9IGNoYXJ0RGF0YVxuXG4gIHpvbmVzID0gem9uZXMuZmlsdGVyKHggPT4gISF4KVxuXG4gIC8vIHJlbmRlciBtdWx0aXBsZSBjb3BpZXMgb2YgZWFjaCBsaW5lIGZvciBzdHJlc3MgdGVzdGluZ1xuICBpZihqYW5rKSB7XG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICAgIHpvbmVzID0gem9uZXMuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcylcbiAgfVxuXG4gIGNvbnN0IHsgcmF0ZSB9ID0gYnVmZmVyUGFyYW1zXG5cbiAgY29uc3QgX3Byb3BzID0gY2hhcnREYXRhLnByb3BlcnRpZXNcbiAgY29uc3QgcHJvcGVydGllcyA9IF9wcm9wcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgbGV0IG1heExpbmVQb2ludHMgPSBNYXRoLm1pbig3MDAsIE1hdGgubWF4KDgwLCAyMDAwMCAvICh6b25lcy5sZW5ndGggKiBwcm9wZXJ0aWVzLmxlbmd0aCkpKSAqIChjaGFydERhdGEucmVzb2x1dGlvbiAvIDQpXG4gIFxuICBjb25zdCB7IHhNaW4sIHhNYXgsIGRYLCB4U2NhbGUsIHZhbGlkIH0gPSBnZXRYUGFyYW1ldGVycyhwb3NpdGlvbiwgY2FudmFzLCBzY2FsZSwgcGF1c2VkKVxuICBpZighdmFsaWQpIHJldHVyblxuXG4gIGNvbnN0IHJlbmRlckxpbWl0ID0geE1pbiAtIDIwMDBcbiAgY29uc3Qgc2FtcGxlID0gYnVmZmVyLmFjdGl2ZS5maWx0ZXIoeCA9PiB4LnRpbWUgPj0gcmVuZGVyTGltaXQpXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgY29uc3QgcmVuZGVyZWQgPSBzYW1wbGUuZmlsdGVyKHggPT4ge1xuICAgIGNvbnN0IHZhbGlkVGltZSA9ICh4LnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlIG1pbk1TSW50ZXJ2YWwgPCAyMDAwIC8gcmF0ZVxuICAgIHJldHVybiB4ID09IHNhbXBsZVswXSB8fCB4ID09IHNhbXBsZVtzYW1wbGUubGVuZ3RoIC0gMV0gfHwgdmFsaWRUaW1lXG4gIH0pXG5cblxuICAvLyByZW5kZXJlZC5yZXZlcnNlKClcblxuICBsZXQgbGluZXMgPSB7fVxuICBsZXQgcmVuZGVyZWRMaW5lcyA9IHt9XG5cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXZnID0ge31cbiAgbGV0IGF1dG9TY2FsZSA9IHt9XG4gIGxldCB5VmFsdWVzID0ge31cbiAgbGV0IHRvdGFsUG9pbnRzID0gMFxuICBjb25zdCBvZmZzZXRZID0gcG9zaXRpb24ucGFuWVxuXG5cbiAgZm9yIChsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgbGluZXNbcHJvcF0gPSBbXVxuICAgIG1heFtwcm9wXSA9IDBcbiAgICBtaW5bcHJvcF0gPSA5OTk5OTk5OTk5OTk5OVxuICAgIHpvbmVzLmZvckVhY2goeCA9PiBsaW5lc1twcm9wXVt4IC0gMV0gPSBbXSlcblxuXG4gICAgLy8gY2FsY3VsYXRlIHggdmFsdWVzIGluIHBpeGVscywgZ2F0aGVyIHkgYXhpcyBkYXRhXG4gICAgZm9yIChsZXQgZnJhbWUgb2YgcmVuZGVyZWQpIHtcbiAgICAgIGNvbnN0IHggPSAoZnJhbWUudGltZSAtIHhNaW4pICogeFNjYWxlXG5cbiAgICAgIGZvciAobGV0IHogb2Ygem9uZXMpIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSB9KVxuICAgICAgICBtYXhbcHJvcF0gPSBNYXRoLm1heChtYXhbcHJvcF0sIHkpXG4gICAgICAgIG1pbltwcm9wXSA9IE1hdGgubWluKG1pbltwcm9wXSwgeSlcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueVtwcm9wXVxuICAgIGNvbnN0IHsgbWluWSwgbWF4WSB9ID0gZ2V0WVBhcmFtZXRlcnMocHJvcCwgbWluW3Byb3BdLCBtYXhbcHJvcF0sIHNjYWxlUGFyYW1zLCBwb3NpdGlvbilcblxuICAgIG1pbltwcm9wXSA9IG1pbllcbiAgICBtYXhbcHJvcF0gPSBtYXhZXG5cbiAgICAvLyBlc3RhYmxpc2ggcGl4ZWwgdG8gdW5pdCByYXRpb1xuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuXG5cbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSB5IHBpeGVsIHZhbHVlcyBiYXNlZCBvbiBlc3RhYmxpc2hlZCBzY2FsZVxuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lc1twcm9wXS5maWx0ZXIoeCA9PiAhIXgpKSB7XG4gICAgICBsZXQgcmVuZGVyZWRMaW5lID0gW11cbiAgICAgIFxuICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgIHBvaW50LnkgPSBvZmZzZXRZICsgcGFyc2VJbnQoY2FudmFzLmhlaWdodCAtIChwb2ludC55IC0gbWluW3Byb3BdKSAqIGF1dG9TY2FsZVtwcm9wXSlcbiAgICAgICAgcmVuZGVyZWRMaW5lLnB1c2gocG9pbnQpXG4gICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXS5wdXNoKHJlbmRlcmVkTGluZSlcbiAgICB9XG5cbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuXG4gICAgaWYoeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyA9PSAwKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cblxuICBpZihjYW52YXMgJiYgY3R4KSB7XG4gICAgZHJhd0xpbmVzKF9wcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKVxuICB9IGVsc2Uge1xuICAgIHN1Ym1pdExpbmVzKHJlbmRlcmVkTGluZXMpXG4gIH1cblxuICBsb2dTdGF0cyh7IHRvdGFsUG9pbnRzLCBtYXgsIG1pbiwgYXZnLCBwbG90RmlsbGVkOiBzYW1wbGUubGVuZ3RoIDwgYnVmZmVyLmFjdGl2ZS5sZW5ndGgsIHhNYXgsIHhNaW4gfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhdyIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpIFxuICAgIH0gZWxzZSB7XG4gICAgICBwb3N0TWVzc2FnZVxuICAgIH1cbiAgfVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5sZXQgcmVxdWVzdEFuaW1GcmFtZVxudHJ5IHtcbiAgcmVxdWVzdEFuaW1GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZVxufSBjYXRjaChlKSB7XG4gIHRyeSB7XG4gICAgcmVxdWVzdEFuaW1GcmFtZSA9IHdlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB9IGNhdGNoKGUpIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IG1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbiAqLyBjYWxsYmFjaywgLyogRE9NRWxlbWVudCAqLyBlbGVtZW50KSB7XG4gICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG5sZXQgcmVmcmVzaFJhdGUgPSA2MFxuXG4vLyBnZXQgcmVmcmVzaCByYXRlIGZvciBjdXJyZW50IGRpc3BsYXlcbmNvbnN0IGdldFJlZnJlc2hSYXRlID0gYXN5bmMgKGZyYW1lcyA9IDYwKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGxhc3RcbiAgICBjb25zdCB0aW1lcyA9IFtdXG4gICAgY29uc3QgZ2V0VGltZSA9IG4gPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgIGlmKGxhc3QpIHRpbWVzLnB1c2gobm93IC0gbGFzdClcbiAgICAgIGxhc3QgPSBub3dcblxuICAgICAgaWYobiA9PSAwKSB7XG4gICAgICAgIGNvbnN0IHRvdGFsID0gdGltZXMucmVkdWNlKCh0b3RhbCwgdCkgPT4gdG90YWwgKyB0LCAwKVxuICAgICAgICBjb25zdCBhdmcgPSB0b3RhbCAvIHRpbWVzLmxlbmd0aFxuICAgICAgICByZXNvbHZlKDEwMDAgLyBhdmcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0QW5pbUZyYW1lKCgpID0+IGdldFRpbWUobiAtIDEpKVxuICAgICAgfVxuICAgIH1cbiAgICBnZXRUaW1lKGZyYW1lcylcbiAgfSlcbn1cblxuZ2V0UmVmcmVzaFJhdGUoMTAwMCkudGhlbihyYXRlID0+IHtcbiAgaWYocmF0ZSA8IDQwKSB7XG4gICAgcmVmcmVzaFJhdGUgPSAzMFxuICB9XG4gIC8vIGNvbnNvbGUubG9nKHJlZnJlc2hSYXRlKVxufSlcblxuXG5jb25zdCByZW5kZXJlcnMgPSB7XG4gICdsaW5lJzogcmVuZGVyTGluZVxufVxuXG5sZXQgY2hhcnREYXRhID0ge1xuICBjYW52YXM6IG51bGwsXG4gIGN0eDogbnVsbCxcbiAgdHlwZTogJycsXG4gIHByb3BlcnRpZXM6IFtdLFxuICBzY2FsZToge1xuICAgIHg6IDEwLFxuICAgIHk6ICdhdXRvJ1xuICB9LFxuICBidWZmZXJQYXJhbXM6IHtcbiAgICByYXRlOiAxMFxuICB9LFxuICAvLyBjdXJyZW50IGRhdGFwb2ludCBkZW5zaXR5IHNldHRpbmcgKDEgLSA0KVxuICByZXNvbHV0aW9uOiA0XG59XG5cbmxldCBwb3J0XG5cblxubGV0IHN0YXRzID0ge31cbmNvbnN0IGxvZ1N0YXRzID0gcyA9PiBzdGF0cyA9IHsgLi4uc3RhdHMsIC4uLnMgfVxuXG4vLyBtb3N0IHJlY2VudCBzZXQgb2YgcmVuZGVyIHRpbWVzICh0byBkZXRlcm1pbmUgZnJhbWUgcmF0ZSlcbmxldCByZW5kZXJUaW1lcyA9IFtdXG5cbi8vIGZyYW1lcmF0ZSBzbmFwc2hvdHMgdG8gbW9uaXRvciBzeXN0ZW0gc3RyYWluXG5sZXQgcGVyZm9ybWFuY2VIaXN0b3J5ID0gW11cblxuLy8gdHJhY2sgbW9zdCByZWNlbnQgXG5sZXQgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4vLyB0cmFjayBudW1iZXIgb2YgdGltZXMgbWF4IFJlc29sdXRpb24gcmVjb21tZW5kZWRcbmxldCBtYXhSZXNDb3VudCA9IDBcblxuXG5cbmxldCBsYXN0ID0gMFxuY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gIGlmIChyZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKSB7XG4gICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc2NhbGUnLCB2YWx1ZTogeyB4TWF4OiBzdGF0cy54TWF4LCB4TWluOiBzdGF0cy54TWluLCBvZmZzZXRzOiBzdGF0cy5vZmZzZXRzIH19KVxuICAgIHJlbmRlcmVyc1tjaGFydERhdGEudHlwZV0oY2hhcnREYXRhLCBsb2dTdGF0cywgc3VibWl0TGluZXMpXG4gICAgcmVuZGVyVGltZXMucHVzaChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxhc3QpXG4gIH1cbiAgbGFzdCA9IHRcbiAgcmVxdWVzdEFuaW1GcmFtZShkcmF3KVxufVxuXG5yZXF1ZXN0QW5pbUZyYW1lKGRyYXcpXG5cbmNvbnN0IHN1Ym1pdExpbmVzID0gbGluZXMgPT4ge1xuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdsaW5lcycsIGxpbmVzIH0pXG59XG5cbmNvbnN0IGNvbGxlY3RTdGF0cyA9ICgpID0+IHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuICBjb25zdCB0b3RhbFJlbmRlciA9IHJlbmRlclRpbWVzLnJlZHVjZSgodCwgdG90YWwpID0+IHRvdGFsICsgdCwgMClcbiAgY29uc3QgYXZnUmVuZGVyID0gdG90YWxSZW5kZXIgLyByZW5kZXJUaW1lcy5sZW5ndGhcbiAgY29uc3QgZnJhbWVyYXRlID0gTWF0aC5jZWlsKDEwMDAgLyBhdmdSZW5kZXIpXG4gIHBlcmZvcm1hbmNlSGlzdG9yeS5wdXNoKGZyYW1lcmF0ZSlcblxuICAvLyBrZWVwIGxhc3QgMTBzIG9mIGZyYW1lcmF0ZSBkYXRhIGZvciBwZXJmb3JtYW5jZSBtb25pdG9yaW5nXG4gIHBlcmZvcm1hbmNlSGlzdG9yeSA9IHBlcmZvcm1hbmNlSGlzdG9yeS5zbGljZSgtMzApXG5cbiAgLy8gdHJ1bmNhdGUgZnJhbWUgZGF0YSB0byBrZWVwIGEgcm9sbGluZyBhdmVyYWdlXG4gIHJlbmRlclRpbWVzID0gcmVuZGVyVGltZXMuc2xpY2UoLTYwKVxuXG4gIC8vIGlmIGVub3VnaCB0aW1lIGhhcyBwYXNzZWQsIGNhbGN1bGF0ZSByZWNvbW1lbmRlZCByZXNvbHV0aW9uXG4gIGlmKG5vdyAtIGxhc3RSZXNvbHV0aW9uQ2hhbmdlID4gMTAwMCkge1xuICAgIGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbm93XG5cbiAgICBjb25zdCByZWNvbW1lbmRlZCA9IE1hdGguY2VpbCgoZnJhbWVyYXRlIC0gMTUpICogNCAvIChyZWZyZXNoUmF0ZSAtIDE1KSlcblxuICAgIGlmKHJlY29tbWVuZGVkID4gMyAmJiBjaGFydERhdGEucmVzb2x1dGlvbiA9PSAzKSB7XG4gICAgICBpZihtYXhSZXNDb3VudCA+IDMpIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gPSA0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXhSZXNDb3VudCArPSAxXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1heFJlc0NvdW50ID0gMFxuXG4gICAgICAvLyBlbnN1cmUgd2UncmUgYWltaW5nIGZvciByZWNvbW1lbmRlZCArLy0gMVxuICAgICAgaWYgKHJlY29tbWVuZGVkIC0gMSA+IGNoYXJ0RGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uICs9IDFcbiAgICAgIH0gZWxzZSBpZiAocmVjb21tZW5kZWQgKyAxIDwgY2hhcnREYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gLT0gMVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNsYW1wIGF0IDEgLSA0XG4gICAgY2hhcnREYXRhLnJlc29sdXRpb24gPSBNYXRoLm1heCgxLCBNYXRoLm1pbihjaGFydERhdGEucmVzb2x1dGlvbiwgNCkpXG5cbiAgICBzdGF0cy5yZXNvbHV0aW9uID0gY2hhcnREYXRhLnJlc29sdXRpb25cbiAgfVxuXG4gIHN0YXRzID0geyAuLi5zdGF0cywgZnJhbWVyYXRlIH1cbiAgY2hhcnREYXRhLmZyYW1lcmF0ZSA9IGZyYW1lcmF0ZVxuXG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3N0YXRzJywgdmFsdWU6IHN0YXRzIH0pXG59XG5cbnNldEludGVydmFsKGNvbGxlY3RTdGF0cywgMyAvIDEwMClcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMgJiYgZS5kYXRhLmNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwiZHJhdyIsInJlbmRlckxpbmUiXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUlBLFFBQU0sR0FBRztFQUNiLEVBQUUsT0FBTyxFQUFFLEVBQUU7RUFDYixFQUFFLE1BQU0sRUFBRSxFQUFFO0VBQ1osRUFBRSxNQUFNLEVBQUUsS0FBSztFQUNmLEVBQUM7QUFHRDtBQUNBO0FBQ0FBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7RUFDOUI7RUFDQSxFQUFFQSxRQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBQztFQUMvRSxFQUFFQSxRQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ2hELEVBQUUsR0FBRyxDQUFDQSxRQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUlBLFFBQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxHQUFFO0VBQ3pDLEdBQUc7RUFDSCxFQUFDO0FBQ0RBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFFO0FBQ3hDQSxVQUFNLENBQUMsSUFBSSxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxNQUFNLEdBQUcsTUFBSztBQUN6Q0EsVUFBTSxD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
