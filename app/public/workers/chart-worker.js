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

    return { xMin, xMax, xRange, dX, xScale }
  };



  // get the y axis bounds
  const getYParameters = (prop, min, max, scaleParams, position) => {
    // console.log(min, max)
    if (!negatives.includes(prop)) {
      min = Math.max(min, 1);
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
    for (let x of [ 1, 10, 100, 200, 500, 1000, 2000, 5000, 10000 ]) {
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
    
    const { xMin, xMax, dX, xScale } = getXParameters(position, canvas, scale, paused);

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
    if(rate < 45) {
      refreshRate = 30;
    }
    console.log(refreshRate);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uZmlsdGVyKHggPT4gISF4KS5zbGljZSgtNzUwMClcbiAgYnVmZmVyLmVudHJpZXMuc29ydCgoYSwgYikgPT4gYS50aW1lIC0gYi50aW1lKVxuICBpZighYnVmZmVyLnBhdXNlZCkge1xuICAgIGJ1ZmZlci5hY3RpdmUgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzIF1cbiAgfVxufVxuYnVmZmVyLnJlc2V0ID0gKCkgPT4gYnVmZmVyLmVudHJpZXMgPSBbXVxuYnVmZmVyLnBsYXkgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gZmFsc2VcbmJ1ZmZlci5wYXVzZSA9ICgpID0+IGJ1ZmZlci5wYXVzZWQgPSB0cnVlXG4iLCJleHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn1cblxuZXhwb3J0IGNvbnN0IGRyYXdMaW5lcyA9IChwcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICBpZihyZW5kZXJlZExpbmVzW3Byb3BdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IHJlbmRlcmVkTGluZXNbcHJvcF1baV1cbiAgICAgICAgc21vb3RoKGN0eCwgbGluZSwgbGluZUNvbG9yc1twcm9wXSwgMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG4vLyBwcm9wZXJ0aWVzIHdoaWNoIGFsbG93IG5lZ2F0aXZlIHZhbHVlc1xuY29uc3QgbmVnYXRpdmVzID0gWyAnZGV2aWF0aW9uJyBdXG5cbmNvbnN0IGdldEJpdCA9IChpbnQsIGJpdCkgPT4gISEoaW50ICYgMSA8PCBiaXQpXG5cbmNvbnN0IGdldFNldHRpbmdzID0gKHpvbmUpID0+IHtcbiAgbGV0IHNldHRpbmdzID0ge1xuICAgIGxvY2tlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDApLFxuICAgIHNlYWxlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDEpLFxuICAgIG9uOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMiksXG4gICAgYXV0bzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDMpLFxuICAgIHN0YW5kYnk6IGdldEJpdCh6b25lLnNldHRpbmdzLCA0KSxcbiAgICBib29zdDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDUpLFxuICAgIHRlc3Rpbmc6IGdldEJpdCh6b25lLnNldHRpbmdzLCA2KSxcbiAgICB0ZXN0X2NvbXBsZXRlOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNylcbiAgfVxuICByZXR1cm4gc2V0dGluZ3Ncbn1cblxuXG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCkgPT4ge1xuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIC4wMSAqIHhSYW5nZSlcblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRlbGF5IC0gdGltZU9mZnNldFxuICBsZXQgcmF3WE1heCA9IHBhdXNlZCA/IGxhdGVzdC50aW1lIC0gZGVsYXkgKiAuMjUgLSB0aW1lT2Zmc2V0IDogbm93XG4gIGxldCByYXdYTWluID0gcmF3WE1heCAtIHhSYW5nZVxuXG4gIGxldCBtaWQgPSByYXdYTWluICsgeFJhbmdlIC8gMlxuICBjb25zdCBzY2FsZWQgPSB4UmFuZ2UgKiB4Wm9vbUZhY3RvciAvIDJcblxuICBjb25zdCB4TWF4ID0gbWlkICsgc2NhbGVkXG4gIGNvbnN0IHhNaW4gPSBtaWQgLSBzY2FsZWRcblxuICBjb25zdCBkWCA9IHhNYXggLSB4TWluXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICByZXR1cm4geyB4TWluLCB4TWF4LCB4UmFuZ2UsIGRYLCB4U2NhbGUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMSlcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuXG4gIC8vIGVuc3VyZSByb3VuZCBudW1iZXJzIGFyZSB1c2VkIGZvciB0aGUgc2NhbGVcbiAgY29uc3QgZXZlbiA9IGkgPT4ge1xuICAgIGlmIChtaW5BdXRvKSBtaW4gPSAtaSArIGkgKiBNYXRoLmNlaWwobWluIC8gaSlcbiAgICBpZiAobWF4QXV0bykgbWF4ID0gaSArIGkgKiBNYXRoLmZsb29yKG1heCAvIGkpXG4gIH1cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxLCAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIHJldHVybiB7IG1pblk6IG1pbiwgbWF4WTogbWF4IH1cbn1cblxuXG4vKipcbiAqIEdlbmVyYXRlIGNhbnZhcyBmcmFtZSBiYXNlZCBvbiBjdXJyZW50IGJ1ZmZlci9jb25maWdcbiAqIEBwYXJhbSB7T2JqZWN0fSBjaGFydERhdGEgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsb2dTdGF0cyBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHN1Ym1pdExpbmVzIFxuICovXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKSA9PiB7XG4gIGNvbnN0IHsgY2FudmFzLCBjdHgsIHNjYWxlLCBwYXVzZWQsIGJ1ZmZlclBhcmFtcywgcG9zaXRpb24gfSA9IGNoYXJ0RGF0YVxuXG4gIGxldCB7IHpvbmVzLCBqYW5rIH0gPSBjaGFydERhdGFcblxuICB6b25lcyA9IHpvbmVzLmZpbHRlcih4ID0+ICEheClcblxuICAvLyByZW5kZXIgbXVsdGlwbGUgY29waWVzIG9mIGVhY2ggbGluZSBmb3Igc3RyZXNzIHRlc3RpbmdcbiAgaWYoamFuaykge1xuICAgIHpvbmVzID0gem9uZXMuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcylcbiAgICB6b25lcyA9IHpvbmVzLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpXG4gIH1cblxuICBjb25zdCB7IHJhdGUgfSA9IGJ1ZmZlclBhcmFtc1xuXG4gIGNvbnN0IF9wcm9wcyA9IGNoYXJ0RGF0YS5wcm9wZXJ0aWVzXG4gIGNvbnN0IHByb3BlcnRpZXMgPSBfcHJvcHMuZmlsdGVyKHggPT4gISF4KVxuXG4gIGxldCBtYXhMaW5lUG9pbnRzID0gTWF0aC5taW4oNzAwLCBNYXRoLm1heCg4MCwgMjAwMDAgLyAoem9uZXMubGVuZ3RoICogcHJvcGVydGllcy5sZW5ndGgpKSkgKiAoY2hhcnREYXRhLnJlc29sdXRpb24gLyA0KVxuICBcbiAgY29uc3QgeyB4TWluLCB4TWF4LCBkWCwgeFNjYWxlIH0gPSBnZXRYUGFyYW1ldGVycyhwb3NpdGlvbiwgY2FudmFzLCBzY2FsZSwgcGF1c2VkKVxuXG4gIGNvbnN0IHJlbmRlckxpbWl0ID0geE1pbiAtIDIwMDBcbiAgY29uc3Qgc2FtcGxlID0gYnVmZmVyLmFjdGl2ZS5maWx0ZXIoeCA9PiB4LnRpbWUgPj0gcmVuZGVyTGltaXQpXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgY29uc3QgcmVuZGVyZWQgPSBzYW1wbGUuZmlsdGVyKHggPT4ge1xuICAgIGNvbnN0IHZhbGlkVGltZSA9ICh4LnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlIG1pbk1TSW50ZXJ2YWwgPCAyMDAwIC8gcmF0ZVxuICAgIHJldHVybiB4ID09IHNhbXBsZVswXSB8fCB4ID09IHNhbXBsZVtzYW1wbGUubGVuZ3RoIC0gMV0gfHwgdmFsaWRUaW1lXG4gIH0pXG5cblxuICAvLyByZW5kZXJlZC5yZXZlcnNlKClcblxuICBsZXQgbGluZXMgPSB7fVxuICBsZXQgcmVuZGVyZWRMaW5lcyA9IHt9XG5cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXZnID0ge31cbiAgbGV0IGF1dG9TY2FsZSA9IHt9XG4gIGxldCB5VmFsdWVzID0ge31cbiAgbGV0IHRvdGFsUG9pbnRzID0gMFxuICBjb25zdCBvZmZzZXRZID0gcG9zaXRpb24ucGFuWVxuXG5cbiAgZm9yIChsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgbGluZXNbcHJvcF0gPSBbXVxuICAgIG1heFtwcm9wXSA9IDBcbiAgICBtaW5bcHJvcF0gPSA5OTk5OTk5OTk5OTk5OVxuICAgIHpvbmVzLmZvckVhY2goeCA9PiBsaW5lc1twcm9wXVt4IC0gMV0gPSBbXSlcblxuXG4gICAgLy8gY2FsY3VsYXRlIHggdmFsdWVzIGluIHBpeGVscywgZ2F0aGVyIHkgYXhpcyBkYXRhXG4gICAgZm9yIChsZXQgZnJhbWUgb2YgcmVuZGVyZWQpIHtcbiAgICAgIGNvbnN0IHggPSAoZnJhbWUudGltZSAtIHhNaW4pICogeFNjYWxlXG5cbiAgICAgIGZvciAobGV0IHogb2Ygem9uZXMpIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSB9KVxuICAgICAgICBtYXhbcHJvcF0gPSBNYXRoLm1heChtYXhbcHJvcF0sIHkpXG4gICAgICAgIG1pbltwcm9wXSA9IE1hdGgubWluKG1pbltwcm9wXSwgeSlcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueVtwcm9wXVxuICAgIGNvbnN0IHsgbWluWSwgbWF4WSB9ID0gZ2V0WVBhcmFtZXRlcnMocHJvcCwgbWluW3Byb3BdLCBtYXhbcHJvcF0sIHNjYWxlUGFyYW1zLCBwb3NpdGlvbilcblxuICAgIG1pbltwcm9wXSA9IG1pbllcbiAgICBtYXhbcHJvcF0gPSBtYXhZXG5cbiAgICAvLyBlc3RhYmxpc2ggcGl4ZWwgdG8gdW5pdCByYXRpb1xuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuXG5cbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSB5IHBpeGVsIHZhbHVlcyBiYXNlZCBvbiBlc3RhYmxpc2hlZCBzY2FsZVxuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lc1twcm9wXS5maWx0ZXIoeCA9PiAhIXgpKSB7XG4gICAgICBsZXQgcmVuZGVyZWRMaW5lID0gW11cbiAgICAgIFxuICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgIHBvaW50LnkgPSBvZmZzZXRZICsgcGFyc2VJbnQoY2FudmFzLmhlaWdodCAtIChwb2ludC55IC0gbWluW3Byb3BdKSAqIGF1dG9TY2FsZVtwcm9wXSlcbiAgICAgICAgcmVuZGVyZWRMaW5lLnB1c2gocG9pbnQpXG4gICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXS5wdXNoKHJlbmRlcmVkTGluZSlcbiAgICB9XG5cbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuXG4gICAgaWYoeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyA9PSAwKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cblxuICBpZihjYW52YXMgJiYgY3R4KSB7XG4gICAgZHJhd0xpbmVzKF9wcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKVxuICB9IGVsc2Uge1xuICAgIHN1Ym1pdExpbmVzKHJlbmRlcmVkTGluZXMpXG4gIH1cblxuICBsb2dTdGF0cyh7IHRvdGFsUG9pbnRzLCBtYXgsIG1pbiwgYXZnLCBwbG90RmlsbGVkOiBzYW1wbGUubGVuZ3RoIDwgYnVmZmVyLmFjdGl2ZS5sZW5ndGgsIHhNYXgsIHhNaW4gfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhdyIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpIFxuICAgIH0gZWxzZSB7XG4gICAgICBwb3N0TWVzc2FnZVxuICAgIH1cbiAgfVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5sZXQgcmVxdWVzdEFuaW1GcmFtZVxudHJ5IHtcbiAgcmVxdWVzdEFuaW1GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZVxufSBjYXRjaChlKSB7XG4gIHRyeSB7XG4gICAgcmVxdWVzdEFuaW1GcmFtZSA9IHdlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB9IGNhdGNoKGUpIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IG1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbiAqLyBjYWxsYmFjaywgLyogRE9NRWxlbWVudCAqLyBlbGVtZW50KSB7XG4gICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG5sZXQgcmVmcmVzaFJhdGUgPSA2MFxuXG4vLyBnZXQgcmVmcmVzaCByYXRlIGZvciBjdXJyZW50IGRpc3BsYXlcbmNvbnN0IGdldFJlZnJlc2hSYXRlID0gYXN5bmMgKGZyYW1lcyA9IDYwKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGxhc3RcbiAgICBjb25zdCB0aW1lcyA9IFtdXG4gICAgY29uc3QgZ2V0VGltZSA9IG4gPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgIGlmKGxhc3QpIHRpbWVzLnB1c2gobm93IC0gbGFzdClcbiAgICAgIGxhc3QgPSBub3dcblxuICAgICAgaWYobiA9PSAwKSB7XG4gICAgICAgIGNvbnN0IHRvdGFsID0gdGltZXMucmVkdWNlKCh0b3RhbCwgdCkgPT4gdG90YWwgKyB0LCAwKVxuICAgICAgICBjb25zdCBhdmcgPSB0b3RhbCAvIHRpbWVzLmxlbmd0aFxuICAgICAgICByZXNvbHZlKDEwMDAgLyBhdmcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0QW5pbUZyYW1lKCgpID0+IGdldFRpbWUobiAtIDEpKVxuICAgICAgfVxuICAgIH1cbiAgICBnZXRUaW1lKGZyYW1lcylcbiAgfSlcbn1cblxuZ2V0UmVmcmVzaFJhdGUoMTAwMCkudGhlbihyYXRlID0+IHtcbiAgaWYocmF0ZSA8IDQ1KSB7XG4gICAgcmVmcmVzaFJhdGUgPSAzMFxuICB9XG4gIGNvbnNvbGUubG9nKHJlZnJlc2hSYXRlKVxufSlcblxuXG5jb25zdCByZW5kZXJlcnMgPSB7XG4gICdsaW5lJzogcmVuZGVyTGluZVxufVxuXG5sZXQgY2hhcnREYXRhID0ge1xuICBjYW52YXM6IG51bGwsXG4gIGN0eDogbnVsbCxcbiAgdHlwZTogJycsXG4gIHByb3BlcnRpZXM6IFtdLFxuICBzY2FsZToge1xuICAgIHg6IDEwLFxuICAgIHk6ICdhdXRvJ1xuICB9LFxuICBidWZmZXJQYXJhbXM6IHtcbiAgICByYXRlOiAxMFxuICB9LFxuICAvLyBjdXJyZW50IGRhdGFwb2ludCBkZW5zaXR5IHNldHRpbmcgKDEgLSA0KVxuICByZXNvbHV0aW9uOiA0XG59XG5cbmxldCBwb3J0XG5cblxubGV0IHN0YXRzID0ge31cbmNvbnN0IGxvZ1N0YXRzID0gcyA9PiBzdGF0cyA9IHsgLi4uc3RhdHMsIC4uLnMgfVxuXG4vLyBtb3N0IHJlY2VudCBzZXQgb2YgcmVuZGVyIHRpbWVzICh0byBkZXRlcm1pbmUgZnJhbWUgcmF0ZSlcbmxldCByZW5kZXJUaW1lcyA9IFtdXG5cbi8vIGZyYW1lcmF0ZSBzbmFwc2hvdHMgdG8gbW9uaXRvciBzeXN0ZW0gc3RyYWluXG5sZXQgcGVyZm9ybWFuY2VIaXN0b3J5ID0gW11cblxuLy8gdHJhY2sgbW9zdCByZWNlbnQgXG5sZXQgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4vLyB0cmFjayBudW1iZXIgb2YgdGltZXMgbWF4IFJlc29sdXRpb24gcmVjb21tZW5kZWRcbmxldCBtYXhSZXNDb3VudCA9IDBcblxuXG5cbmxldCBsYXN0ID0gMFxuY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gIGlmIChyZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKSB7XG4gICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc2NhbGUnLCB2YWx1ZTogeyB4TWF4OiBzdGF0cy54TWF4LCB4TWluOiBzdGF0cy54TWluLCBvZmZzZXRzOiBzdGF0cy5vZmZzZXRzIH19KVxuICAgIHJlbmRlcmVyc1tjaGFydERhdGEudHlwZV0oY2hhcnREYXRhLCBsb2dTdGF0cywgc3VibWl0TGluZXMpXG4gICAgcmVuZGVyVGltZXMucHVzaChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxhc3QpXG4gIH1cbiAgbGFzdCA9IHRcbiAgcmVxdWVzdEFuaW1GcmFtZShkcmF3KVxufVxuXG5yZXF1ZXN0QW5pbUZyYW1lKGRyYXcpXG5cbmNvbnN0IHN1Ym1pdExpbmVzID0gbGluZXMgPT4ge1xuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdsaW5lcycsIGxpbmVzIH0pXG59XG5cbmNvbnN0IGNvbGxlY3RTdGF0cyA9ICgpID0+IHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuICBjb25zdCB0b3RhbFJlbmRlciA9IHJlbmRlclRpbWVzLnJlZHVjZSgodCwgdG90YWwpID0+IHRvdGFsICsgdCwgMClcbiAgY29uc3QgYXZnUmVuZGVyID0gdG90YWxSZW5kZXIgLyByZW5kZXJUaW1lcy5sZW5ndGhcbiAgY29uc3QgZnJhbWVyYXRlID0gTWF0aC5jZWlsKDEwMDAgLyBhdmdSZW5kZXIpXG4gIHBlcmZvcm1hbmNlSGlzdG9yeS5wdXNoKGZyYW1lcmF0ZSlcblxuICAvLyBrZWVwIGxhc3QgMTBzIG9mIGZyYW1lcmF0ZSBkYXRhIGZvciBwZXJmb3JtYW5jZSBtb25pdG9yaW5nXG4gIHBlcmZvcm1hbmNlSGlzdG9yeSA9IHBlcmZvcm1hbmNlSGlzdG9yeS5zbGljZSgtMzApXG5cbiAgLy8gdHJ1bmNhdGUgZnJhbWUgZGF0YSB0byBrZWVwIGEgcm9sbGluZyBhdmVyYWdlXG4gIHJlbmRlclRpbWVzID0gcmVuZGVyVGltZXMuc2xpY2UoLTYwKVxuXG4gIC8vIGlmIGVub3VnaCB0aW1lIGhhcyBwYXNzZWQsIGNhbGN1bGF0ZSByZWNvbW1lbmRlZCByZXNvbHV0aW9uXG4gIGlmKG5vdyAtIGxhc3RSZXNvbHV0aW9uQ2hhbmdlID4gMTAwMCkge1xuICAgIGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbm93XG5cbiAgICBjb25zdCByZWNvbW1lbmRlZCA9IE1hdGguY2VpbCgoZnJhbWVyYXRlIC0gMTUpICogNCAvIChyZWZyZXNoUmF0ZSAtIDE1KSlcblxuICAgIGlmKHJlY29tbWVuZGVkID4gMyAmJiBjaGFydERhdGEucmVzb2x1dGlvbiA9PSAzKSB7XG4gICAgICBpZihtYXhSZXNDb3VudCA+IDMpIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gPSA0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXhSZXNDb3VudCArPSAxXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1heFJlc0NvdW50ID0gMFxuXG4gICAgICAvLyBlbnN1cmUgd2UncmUgYWltaW5nIGZvciByZWNvbW1lbmRlZCArLy0gMVxuICAgICAgaWYgKHJlY29tbWVuZGVkIC0gMSA+IGNoYXJ0RGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uICs9IDFcbiAgICAgIH0gZWxzZSBpZiAocmVjb21tZW5kZWQgKyAxIDwgY2hhcnREYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gLT0gMVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNsYW1wIGF0IDEgLSA0XG4gICAgY2hhcnREYXRhLnJlc29sdXRpb24gPSBNYXRoLm1heCgxLCBNYXRoLm1pbihjaGFydERhdGEucmVzb2x1dGlvbiwgNCkpXG5cbiAgICBzdGF0cy5yZXNvbHV0aW9uID0gY2hhcnREYXRhLnJlc29sdXRpb25cbiAgfVxuXG4gIHN0YXRzID0geyAuLi5zdGF0cywgZnJhbWVyYXRlIH1cbiAgY2hhcnREYXRhLmZyYW1lcmF0ZSA9IGZyYW1lcmF0ZVxuXG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3N0YXRzJywgdmFsdWU6IHN0YXRzIH0pXG59XG5cbnNldEludGVydmFsKGNvbGxlY3RTdGF0cywgMyAvIDEwMClcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMgJiYgZS5kYXRhLmNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwiZHJhdyIsInJlbmRlckxpbmUiXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUlBLFFBQU0sR0FBRztFQUNiLEVBQUUsT0FBTyxFQUFFLEVBQUU7RUFDYixFQUFFLE1BQU0sRUFBRSxFQUFFO0VBQ1osRUFBRSxNQUFNLEVBQUUsS0FBSztFQUNmLEVBQUM7QUFHRDtBQUNBO0FBQ0FBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7RUFDOUI7RUFDQSxFQUFFQSxRQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBQztFQUMvRSxFQUFFQSxRQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ2hELEVBQUUsR0FBRyxDQUFDQSxRQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUlBLFFBQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxHQUFFO0VBQ3pDLEdBQUc7RUFDSCxFQUFDO0FBQ0RBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFFO0FBQ3hDQSxVQUFNLENBQUMsSUFBSSxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxNQUFNLEdBQUcsTUFBSztBQUN6Q0EsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHOztFQ25COUIsTUFBTSxNQUFNLEdBQUc7RUFDdEIsRUFBRSxDQUFDLEVBQUUs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Q2pDLEVBQUM7QUFDRDtBQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTUMsTUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEtBQUs7RUFDbkQsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsR0FBRyxVQUFTO0FBQzFFO0VBQ0EsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLFVBQVM7QUFDakM7RUFDQSxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ2hDO0VBQ0E7RUFDQSxFQUFFLEdBQUcsSUFBSSxFQUFFO0VBQ1gsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMzRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQzNELEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLGFBQVk7QUFDL0I7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFVO0VBQ3JDLEVBQUUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztBQUM1QztFQUNBLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxT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
