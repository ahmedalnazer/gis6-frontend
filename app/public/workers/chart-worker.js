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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uZmlsdGVyKHggPT4gISF4KS5zbGljZSgtNzUwMClcbiAgYnVmZmVyLmVudHJpZXMuc29ydCgoYSwgYikgPT4gYS50aW1lIC0gYi50aW1lKVxuICBpZighYnVmZmVyLnBhdXNlZCkge1xuICAgIGJ1ZmZlci5hY3RpdmUgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzIF1cbiAgfVxufVxuYnVmZmVyLnJlc2V0ID0gKCkgPT4gYnVmZmVyLmVudHJpZXMgPSBbXVxuYnVmZmVyLnBsYXkgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gZmFsc2VcbmJ1ZmZlci5wYXVzZSA9ICgpID0+IGJ1ZmZlci5wYXVzZWQgPSB0cnVlXG4iLCJleHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn1cblxuZXhwb3J0IGNvbnN0IGRyYXdMaW5lcyA9IChwcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICBpZihyZW5kZXJlZExpbmVzW3Byb3BdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IHJlbmRlcmVkTGluZXNbcHJvcF1baV1cbiAgICAgICAgc21vb3RoKGN0eCwgbGluZSwgbGluZUNvbG9yc1twcm9wXSwgMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG4vLyBwcm9wZXJ0aWVzIHdoaWNoIGFsbG93IG5lZ2F0aXZlIHZhbHVlc1xuY29uc3QgbmVnYXRpdmVzID0gWyAnZGV2aWF0aW9uJyBdXG5cbmNvbnN0IGdldEJpdCA9IChpbnQsIGJpdCkgPT4gISEoaW50ICYgMSA8PCBiaXQpXG5cbmNvbnN0IGdldFNldHRpbmdzID0gKHpvbmUpID0+IHtcbiAgbGV0IHNldHRpbmdzID0ge1xuICAgIGxvY2tlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDApLFxuICAgIHNlYWxlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDEpLFxuICAgIG9uOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMiksXG4gICAgYXV0bzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDMpLFxuICAgIHN0YW5kYnk6IGdldEJpdCh6b25lLnNldHRpbmdzLCA0KSxcbiAgICBib29zdDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDUpLFxuICAgIHRlc3Rpbmc6IGdldEJpdCh6b25lLnNldHRpbmdzLCA2KSxcbiAgICB0ZXN0X2NvbXBsZXRlOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNylcbiAgfVxuICByZXR1cm4gc2V0dGluZ3Ncbn1cblxuXG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCkgPT4ge1xuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIC4wMSAqIHhSYW5nZSlcblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRlbGF5IC0gdGltZU9mZnNldFxuICBsZXQgcmF3WE1heCA9IHBhdXNlZCA/IGxhdGVzdC50aW1lIC0gZGVsYXkgKiAuMjUgLSB0aW1lT2Zmc2V0IDogbm93XG4gIGxldCByYXdYTWluID0gcmF3WE1heCAtIHhSYW5nZVxuXG4gIGxldCBtaWQgPSByYXdYTWluICsgeFJhbmdlIC8gMlxuICBjb25zdCBzY2FsZWQgPSB4UmFuZ2UgKiB4Wm9vbUZhY3RvciAvIDJcblxuICBjb25zdCB4TWF4ID0gbWlkICsgc2NhbGVkXG4gIGNvbnN0IHhNaW4gPSBtaWQgLSBzY2FsZWRcblxuICBjb25zdCBkWCA9IHhNYXggLSB4TWluXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICByZXR1cm4geyB4TWluLCB4TWF4LCB4UmFuZ2UsIGRYLCB4U2NhbGUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMClcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuICAvLyBlbnN1cmUgcm91bmQgbnVtYmVycyBhcmUgdXNlZCBmb3IgdGhlIHNjYWxlXG4gIGNvbnN0IGV2ZW4gPSBpID0+IHtcbiAgICBpZiAobWluQXV0bykgbWluID0gLWkgKyBpICogTWF0aC5jZWlsKG1pbiAvIGkpXG4gICAgaWYgKG1heEF1dG8pIG1heCA9IGkgKyBpICogTWF0aC5mbG9vcihtYXggLyBpKVxuICB9XG5cbiAgXG5cbiAgbGV0IG1hdGNoZWQgPSBmYWxzZVxuICBmb3IgKGxldCB4IG9mIFsgMTAsIDEwMCwgMjAwLCA1MDAsIDEwMDAsIDIwMDAsIDUwMDAsIDEwMDAwIF0pIHtcbiAgICBpZiAobWF0Y2hlZCkgYnJlYWtcbiAgICBmb3IgKGxldCB5IG9mIFsgMSwgMiwgNCwgOCBdKSB7XG4gICAgICBjb25zdCBiYXNlID0geCAqIHlcbiAgICAgIGlmIChyIDwgYmFzZSkge1xuICAgICAgICBldmVuKGJhc2UgLyA1KVxuICAgICAgICBtYXRjaGVkID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICghbWF0Y2hlZCkgZXZlbigyMDAwMClcblxuICByZXR1cm4geyBtaW5ZOiBtaW4sIG1heFk6IG1heCB9XG59XG5cblxuLyoqXG4gKiBHZW5lcmF0ZSBjYW52YXMgZnJhbWUgYmFzZWQgb24gY3VycmVudCBidWZmZXIvY29uZmlnXG4gKiBAcGFyYW0ge09iamVjdH0gY2hhcnREYXRhIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gbG9nU3RhdHMgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzdWJtaXRMaW5lcyBcbiAqL1xuY29uc3QgZHJhdyA9IChjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcykgPT4ge1xuICBjb25zdCB7IGNhbnZhcywgY3R4LCBzY2FsZSwgcGF1c2VkLCBidWZmZXJQYXJhbXMsIHBvc2l0aW9uIH0gPSBjaGFydERhdGFcblxuICBsZXQgeyB6b25lcywgamFuayB9ID0gY2hhcnREYXRhXG5cbiAgem9uZXMgPSB6b25lcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgLy8gcmVuZGVyIG11bHRpcGxlIGNvcGllcyBvZiBlYWNoIGxpbmUgZm9yIHN0cmVzcyB0ZXN0aW5nXG4gIGlmKGphbmspIHtcbiAgICB6b25lcyA9IHpvbmVzLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpXG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICB9XG5cbiAgY29uc3QgeyByYXRlIH0gPSBidWZmZXJQYXJhbXNcblxuICBjb25zdCBfcHJvcHMgPSBjaGFydERhdGEucHJvcGVydGllc1xuICBjb25zdCBwcm9wZXJ0aWVzID0gX3Byb3BzLmZpbHRlcih4ID0+ICEheClcblxuICBsZXQgbWF4TGluZVBvaW50cyA9IE1hdGgubWluKDcwMCwgTWF0aC5tYXgoODAsIDIwMDAwIC8gKHpvbmVzLmxlbmd0aCAqIHByb3BlcnRpZXMubGVuZ3RoKSkpICogKGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC8gNClcbiAgXG4gIGNvbnN0IHsgeE1pbiwgeE1heCwgZFgsIHhTY2FsZSB9ID0gZ2V0WFBhcmFtZXRlcnMocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZClcblxuICBjb25zdCByZW5kZXJMaW1pdCA9IHhNaW4gLSAyMDAwXG4gIGNvbnN0IHNhbXBsZSA9IGJ1ZmZlci5hY3RpdmUuZmlsdGVyKHggPT4geC50aW1lID49IHJlbmRlckxpbWl0KVxuXG4gIC8vIGRldGVybWluZSB3aGljaCBwb2ludHMgc2hvdWxkIGJlIGZpbHRlcmVkIGJhc2VkIG9uIG1heCBwb2ludHMgcGVyIGxpbmVcbiAgY29uc3QgbWluTVNJbnRlcnZhbCA9IGRYIC8gbWF4TGluZVBvaW50c1xuXG4gIGNvbnN0IHJlbmRlcmVkID0gc2FtcGxlLmZpbHRlcih4ID0+IHtcbiAgICBjb25zdCB2YWxpZFRpbWUgPSAoeC50aW1lIC0gMTYxNDc5OTE2MDAwMCkgJSBtaW5NU0ludGVydmFsIDwgMjAwMCAvIHJhdGVcbiAgICByZXR1cm4geCA9PSBzYW1wbGVbMF0gfHwgeCA9PSBzYW1wbGVbc2FtcGxlLmxlbmd0aCAtIDFdIHx8IHZhbGlkVGltZVxuICB9KVxuXG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIGxldCBtYXggPSB7fVxuICBsZXQgbWluID0ge31cbiAgbGV0IGF2ZyA9IHt9XG4gIGxldCBhdXRvU2NhbGUgPSB7fVxuICBsZXQgeVZhbHVlcyA9IHt9XG4gIGxldCB0b3RhbFBvaW50cyA9IDBcbiAgY29uc3Qgb2Zmc2V0WSA9IHBvc2l0aW9uLnBhbllcblxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgIGxpbmVzW3Byb3BdID0gW11cbiAgICBtYXhbcHJvcF0gPSAwXG4gICAgbWluW3Byb3BdID0gOTk5OTk5OTk5OTk5OTlcbiAgICB6b25lcy5mb3JFYWNoKHggPT4gbGluZXNbcHJvcF1beCAtIDFdID0gW10pXG5cblxuICAgIC8vIGNhbGN1bGF0ZSB4IHZhbHVlcyBpbiBwaXhlbHMsIGdhdGhlciB5IGF4aXMgZGF0YVxuICAgIGZvciAobGV0IGZyYW1lIG9mIHJlbmRlcmVkKSB7XG4gICAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgICBmb3IgKGxldCB6IG9mIHpvbmVzKSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gZnJhbWUuZGF0YVt6IC0gMV1cblxuICAgICAgICBsZXQgeSA9IHBvaW50W3Byb3BdXG4gICAgICAgIGlmIChwcm9wID09ICdkZXZpYXRpb24nKSB7XG4gICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncyhwb2ludClcbiAgICAgICAgICBpZiAoc2V0dGluZ3MubWFudWFsKSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQubWFudWFsX3NwIC0gcG9pbnQuYWN0dWFsX3BlcmNlbnRcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeSA9IHBvaW50LnRlbXBfc3AgLSBwb2ludC5hY3R1YWxfdGVtcFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsaW5lc1twcm9wXVt6IC0gMV0ucHVzaCh7IHgsIHkgfSlcbiAgICAgICAgbWF4W3Byb3BdID0gTWF0aC5tYXgobWF4W3Byb3BdLCB5KVxuICAgICAgICBtaW5bcHJvcF0gPSBNYXRoLm1pbihtaW5bcHJvcF0sIHkpXG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBjb25zdCBzY2FsZVBhcmFtcyA9IHNjYWxlLnlbcHJvcF1cbiAgICBjb25zdCB7IG1pblksIG1heFkgfSA9IGdldFlQYXJhbWV0ZXJzKHByb3AsIG1pbltwcm9wXSwgbWF4W3Byb3BdLCBzY2FsZVBhcmFtcywgcG9zaXRpb24pXG5cbiAgICBtaW5bcHJvcF0gPSBtaW5ZXG4gICAgbWF4W3Byb3BdID0gbWF4WVxuXG4gICAgLy8gZXN0YWJsaXNoIHBpeGVsIHRvIHVuaXQgcmF0aW9cbiAgICBhdXRvU2NhbGVbcHJvcF0gPSBjYW52YXMuaGVpZ2h0IC8gKG1heFtwcm9wXSAtIG1pbltwcm9wXSlcblxuXG4gICAgcmVuZGVyZWRMaW5lc1twcm9wXSA9IFtdXG4gICAgeVZhbHVlc1twcm9wXSA9IHtcbiAgICAgIHRvdGFsOiAwLFxuICAgICAgdG90YWxQb2ludHM6IDBcbiAgICB9XG5cbiAgICAvLyBjYWxjdWxhdGUgeSBwaXhlbCB2YWx1ZXMgYmFzZWQgb24gZXN0YWJsaXNoZWQgc2NhbGVcbiAgICBmb3IobGV0IGxpbmUgb2YgbGluZXNbcHJvcF0uZmlsdGVyKHggPT4gISF4KSkge1xuICAgICAgbGV0IHJlbmRlcmVkTGluZSA9IFtdXG4gICAgICBcbiAgICAgIGZvciAobGV0IHBvaW50IG9mIGxpbmUpIHtcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbCArPSBwb2ludC55XG4gICAgICAgIHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHMgKz0gMVxuICAgICAgICBwb2ludC55ID0gb2Zmc2V0WSArIHBhcnNlSW50KGNhbnZhcy5oZWlnaHQgLSAocG9pbnQueSAtIG1pbltwcm9wXSkgKiBhdXRvU2NhbGVbcHJvcF0pXG4gICAgICAgIHJlbmRlcmVkTGluZS5wdXNoKHBvaW50KVxuICAgICAgICB0b3RhbFBvaW50cysrXG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlbmRlcmVkTGluZXNbcHJvcF0ucHVzaChyZW5kZXJlZExpbmUpXG4gICAgfVxuXG4gICAgYXZnW3Byb3BdID0geVZhbHVlc1twcm9wXS50b3RhbCAvIHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHNcblxuICAgIGlmKHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHMgPT0gMCkge1xuICAgICAgbWluW3Byb3BdID0gMFxuICAgICAgbWF4W3Byb3BdID0gMFxuICAgIH1cbiAgfVxuXG5cbiAgaWYoY2FudmFzICYmIGN0eCkge1xuICAgIGRyYXdMaW5lcyhfcHJvcHMsIGNhbnZhcywgcmVuZGVyZWRMaW5lcylcbiAgfSBlbHNlIHtcbiAgICBzdWJtaXRMaW5lcyhyZW5kZXJlZExpbmVzKVxuICB9XG5cbiAgbG9nU3RhdHMoeyB0b3RhbFBvaW50cywgbWF4LCBtaW4sIGF2ZywgcGxvdEZpbGxlZDogc2FtcGxlLmxlbmd0aCA8IGJ1ZmZlci5hY3RpdmUubGVuZ3RoLCB4TWF4LCB4TWluIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRyYXciLCJleHBvcnQgY29uc3QgbWF4Q2h1bmtTaXplID0gMTAwXG5cbmxldCBwYXJhbXMgPSB7XG4gIHJhdGU6IDEwXG59XG5cbmxldCBidWZmZXIgPSBbXVxuXG5cbi8vIGVuc3VyZSBidWZmZXIgaXMgbmV2ZXIgZmlsbGVkIGZhc3RlciB0aGFuIHRoZSBzcGVjaWZpZWQgcmF0ZVxuY29uc3QgdHJ5UHVzaCA9IChmcmFtZSkgPT4ge1xuICBmcmFtZS50cyA9IGZyYW1lLnRpbWUuZ2V0VGltZSgpXG4gIGNvbnN0IGxhc3RGcmFtZSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cbiAgaWYoIWxhc3RGcmFtZSkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICAgIHJldHVyblxuICB9XG4gIC8vIG1pbiBpbnRlcnZhbCBpcyBtaW4gbXMgYmV0d2VlbiBmcmFtZXMgd2l0aCA1bXMgcGFkZGluZ1xuICBjb25zdCBtaW5JbnR2bCA9IDEwMDAgLyBwYXJhbXMucmF0ZSArIDVcbiAgaWYoZnJhbWUudGltZSAtIGxhc3RGcmFtZS50aW1lID49IG1pbkludHZsKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgYnVmZmVyXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uICh7IHRzLCBkYXRhIH0pIHtcblxuICAvLyBzaW11bGF0ZSA0NTAgem9uZXNcbiAgLy8gZGF0YSA9IGRhdGEuY29uY2F0KGRhdGEpLmNvbmNhdChkYXRhKVxuXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0cylcbiAgY29uc3QgZnJhbWUgPSB7IGRhdGEsIGRhdGUsIHRpbWU6IHRzIH1cblxuICB0cnlQdXNoKGZyYW1lKVxuICAvLyB0d2VlbihmcmFtZSwgMTIpXG5cbiAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKC03NTAwKVxufVxuXG5cbmxldCBpbnRlcnZhbHMgPSB7fVxubGV0IGxhdGVzdCA9IHt9XG5sZXQgZWFybGllc3QgPSB7fVxubGV0IG5lZWRzUmVzZXQgPSB7fVxuXG5leHBvcnQgY29uc3QgYnVmZmVyQ29tbWFuZHMgPSAocG9ydCwgZSwgaWQpID0+IHtcbiAgY29uc3QgeyBkYXRhIH0gPSBlXG5cbiAgY29uc3QgcG9zdCA9IChkYXRhKSA9PiB7XG4gICAgaWYocG9ydCkge1xuICAgICAgcG9ydC5wb3N0TWVzc2FnZShkYXRhKSBcbiAgICB9IGVsc2Uge1xuICAgICAgcG9zdE1lc3NhZ2VcbiAgICB9XG4gIH1cbiAgXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3JlYWRCdWZmZXInKSB7XG5cbiAgICAvLyBzZW5kIGRhdGEgaW4gYmF0Y2hlcywgbGltaXRpbmcgbWF4IHRvIGF2b2lkIE9PTSB3aGVuIHNlcmlhbGl6aW5nIHRvXG4gICAgLy8gcGFzcyBiZXR3ZWVuIHRocmVhZHNcbiAgICBjb25zdCBzZW5kQ2h1bmsgPSAoKSA9PiB7XG4gICAgICBjb25zdCByZXNldEJ1ZmZlciA9ICgpID0+IHtcbiAgICAgICAgbGF0ZXN0W2lkXSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0gJiYgYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXS50c1xuICAgICAgICBlYXJsaWVzdFtpZF0gPSBsYXRlc3RbaWRdICsgMVxuICAgICAgICBuZWVkc1Jlc2V0W2lkXSA9IGZhbHNlXG4gICAgICB9XG4gICAgICBpZiAoIWxhdGVzdFtpZF0gJiYgYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICB9XG5cbiAgICAgIGlmKG5lZWRzUmVzZXRbaWRdKSB7XG4gICAgICAgIHBvc3QoJ3Jlc2V0JylcbiAgICAgICAgcmVzZXRCdWZmZXIoKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYobGF0ZXN0W2lkXSkge1xuICAgICAgICBjb25zdCBuZXdlc3QgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA+IGxhdGVzdFtpZF0pXG4gICAgICAgIGNvbnN0IGJhY2tGaWxsID0gYnVmZmVyLmZpbHRlcih4ID0+IHgudHMgPCBlYXJsaWVzdFtpZF0pLnNsaWNlKC0obWF4Q2h1bmtTaXplIC0gbmV3ZXN0Lmxlbmd0aCkpXG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGJhY2tGaWxsLmNvbmNhdChuZXdlc3QpXG4gICAgICAgIGlmICh1cGRhdGUubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbGF0ZXN0RW50cnkgPSB1cGRhdGVbdXBkYXRlLmxlbmd0aCAtIDFdXG4gICAgICAgICAgY29uc3QgZmlyc3RFbnRyeSA9IHVwZGF0ZVswXVxuICAgICAgICAgIGxhdGVzdFtpZF0gPSBsYXRlc3RFbnRyeS50aW1lXG4gICAgICAgICAgaWYoZmlyc3RFbnRyeS50aW1lIDwgZWFybGllc3RbaWRdKSBlYXJsaWVzdFtpZF0gPSBmaXJzdEVudHJ5LnRpbWVcbiAgICAgICAgICBwb3N0KHsgdXBkYXRlLCBwYXJhbXMgfSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coc2l6ZU9mKFsgLi4uYnVmZmVyIF0pKVxuICAgIH1cblxuICAgIGludGVydmFsc1tpZF0gPSBzZXRJbnRlcnZhbChzZW5kQ2h1bmssIDIwMClcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3NldEJ1ZmZlclBhcmFtcycpIHtcbiAgICBsZXQgcmVzZXQgPSBmYWxzZVxuICAgIGNvbnNvbGUubG9nKCdzZXR0aW5nIHBhcmFtcycsIGRhdGEucGFyYW1zKVxuICAgIGZvcihsZXQga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEucGFyYW1zKSkge1xuICAgICAgaWYoZGF0YS5wYXJhbXNba2V5XSAhPSBwYXJhbXNba2V5XSkge1xuICAgICAgICByZXNldCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgcGFyYW1zID0geyAuLi5wYXJhbXMsIC4uLmRhdGEucGFyYW1zIHx8IHt9fVxuICAgIGlmKHJlc2V0KSB7XG4gICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoMCwgMClcbiAgICAgIGZvciAobGV0IGtleSBvZiBPYmplY3Qua2V5cyhuZWVkc1Jlc2V0KSkge1xuICAgICAgICBuZWVkc1Jlc2V0W2tleV0gPSB0cnVlXG4gICAgICB9XG4gICAgfSBcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ2Nsb3NlJykge1xuICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxzW2lkXSlcbiAgICBsYXRlc3RbaWRdID0gMFxuICB9XG59XG5cblxuXG5cblxuXG4vLyB1dGlsaXRpZXMgZm9yIHRlc3RpbmdcblxuY29uc3QgdHdlZW4gPSAobmV4dCwgZnJhbWVzKSA9PiB7XG5cbiAgbGV0IGZyYW1lTGlzdCA9IFtdXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgZnJhbWVzOyBpKyspIHtcbiAgICBmcmFtZUxpc3QucHVzaChpKVxuICB9XG5cbiAgY29uc3QgeyB0aW1lLCBkYXRhIH0gPSBuZXh0XG4gIGNvbnN0IGxhc3RCdWZmZXIgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG5cbiAgLy8gdGVzdCB0d2VlbmluZ1xuICBpZiAobGFzdEJ1ZmZlcikge1xuICAgIGZvciAobGV0IHggb2YgZnJhbWVMaXN0KSB7XG4gICAgICBsZXQgdHdlZW4gPSBbXVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0QnVmZmVyLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGFzdCA9IGxhc3RCdWZmZXIuZGF0YVtpXVxuICAgICAgICBjb25zdCBjdXJyZW50ID0gZGF0YVtpXVxuICAgICAgICBpZiAobGFzdCAmJiBjdXJyZW50KSB7XG4gICAgICAgICAgbGV0IHR3ZWVuZWQgPSB7IC4uLmN1cnJlbnQgfVxuICAgICAgICAgIGZvciAobGV0IHByb3Agb2YgWyAnYWN0dWFsX3RlbXAnLCAnYWN0dWFsX2N1cnJlbnQnLCAnYWN0dWFsX3BlcmNlbnQnIF0pIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHByb3ApXG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IChjdXJyZW50W3Byb3BdIC0gbGFzdFtwcm9wXSkgLyBmcmFtZXNcbiAgICAgICAgICAgIHR3ZWVuZWRbcHJvcF0gPSBsYXN0W3Byb3BdICsgZGVsdGEgKiB4XG4gICAgICAgICAgfVxuICAgICAgICAgIHR3ZWVuLnB1c2godHdlZW5lZClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3Qgb2Zmc2V0ID0gNTAwIC8gZnJhbWVzICogeFxuICAgICAgY29uc3QgdXBkYXRlZFRTID0gdGltZSAtIDUwMCArIG9mZnNldFxuICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRUUylcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaCh7IHRpbWU6IG5ldyBEYXRlKHVwZGF0ZWRUUyksIHRzOiB1cGRhdGVkVFMsIGRhdGUsIGRhdGE6IHR3ZWVuIH0pLCBvZmZzZXQpXG4gICAgfVxuICB9XG4gIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaChuZXh0KSwgNTAwKVxufVxuXG5cblxuY29uc3QgdHlwZVNpemVzID0ge1xuICBcInVuZGVmaW5lZFwiOiAoKSA9PiAwLFxuICBcImJvb2xlYW5cIjogKCkgPT4gNCxcbiAgXCJudW1iZXJcIjogKCkgPT4gOCxcbiAgXCJzdHJpbmdcIjogaXRlbSA9PiAyICogaXRlbS5sZW5ndGgsXG4gIFwib2JqZWN0XCI6IGl0ZW0gPT4gIWl0ZW0gPyAwIDogT2JqZWN0XG4gICAgLmtleXMoaXRlbSlcbiAgICAucmVkdWNlKCh0b3RhbCwga2V5KSA9PiBzaXplT2Yoa2V5KSArIHNpemVPZihpdGVtW2tleV0pICsgdG90YWwsIDApXG59XG5cbmNvbnN0IHNpemVPZiA9IHZhbHVlID0+IHR5cGVTaXplc1t0eXBlb2YgdmFsdWVdKHZhbHVlKSIsImltcG9ydCByZW5kZXJMaW5lIGZyb20gJy4vbGluZS1wbG90J1xuaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IG1heENodW5rU2l6ZSB9IGZyb20gJy4uL3JlYWx0aW1lL2J1ZmZlcidcblxubGV0IHJlcXVlc3RBbmltRnJhbWVcbnRyeSB7XG4gIHJlcXVlc3RBbmltRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbn0gY2F0Y2goZSkge1xuICB0cnkge1xuICAgIHJlcXVlc3RBbmltRnJhbWUgPSB3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfSBjYXRjaChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb24gKi8gY2FsbGJhY2ssIC8qIERPTUVsZW1lbnQgKi8gZWxlbWVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxubGV0IHJlZnJlc2hSYXRlID0gNjBcblxuLy8gZ2V0IHJlZnJlc2ggcmF0ZSBmb3IgY3VycmVudCBkaXNwbGF5XG5jb25zdCBnZXRSZWZyZXNoUmF0ZSA9IGFzeW5jIChmcmFtZXMgPSA2MCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBsYXN0XG4gICAgY29uc3QgdGltZXMgPSBbXVxuICAgIGNvbnN0IGdldFRpbWUgPSBuID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICBpZihsYXN0KSB0aW1lcy5wdXNoKG5vdyAtIGxhc3QpXG4gICAgICBsYXN0ID0gbm93XG5cbiAgICAgIGlmKG4gPT0gMCkge1xuICAgICAgICBjb25zdCB0b3RhbCA9IHRpbWVzLnJlZHVjZSgodG90YWwsIHQpID0+IHRvdGFsICsgdCwgMClcbiAgICAgICAgY29uc3QgYXZnID0gdG90YWwgLyB0aW1lcy5sZW5ndGhcbiAgICAgICAgcmVzb2x2ZSgxMDAwIC8gYXZnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEFuaW1GcmFtZSgoKSA9PiBnZXRUaW1lKG4gLSAxKSlcbiAgICAgIH1cbiAgICB9XG4gICAgZ2V0VGltZShmcmFtZXMpXG4gIH0pXG59XG5cbmdldFJlZnJlc2hSYXRlKDEwMDApLnRoZW4ocmF0ZSA9PiB7XG4gIGlmKHJhdGUgPCA0MCkge1xuICAgIHJlZnJlc2hSYXRlID0gMzBcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhyZWZyZXNoUmF0ZSlcbn0pXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfSxcbiAgYnVmZmVyUGFyYW1zOiB7XG4gICAgcmF0ZTogMTBcbiAgfSxcbiAgLy8gY3VycmVudCBkYXRhcG9pbnQgZGVuc2l0eSBzZXR0aW5nICgxIC0gNClcbiAgcmVzb2x1dGlvbjogNFxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuLy8gbW9zdCByZWNlbnQgc2V0IG9mIHJlbmRlciB0aW1lcyAodG8gZGV0ZXJtaW5lIGZyYW1lIHJhdGUpXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG4vLyBmcmFtZXJhdGUgc25hcHNob3RzIHRvIG1vbml0b3Igc3lzdGVtIHN0cmFpblxubGV0IHBlcmZvcm1hbmNlSGlzdG9yeSA9IFtdXG5cbi8vIHRyYWNrIG1vc3QgcmVjZW50IFxubGV0IGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuLy8gdHJhY2sgbnVtYmVyIG9mIHRpbWVzIG1heCBSZXNvbHV0aW9uIHJlY29tbWVuZGVkXG5sZXQgbWF4UmVzQ291bnQgPSAwXG5cblxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3NjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiwgb2Zmc2V0czogc3RhdHMub2Zmc2V0cyB9fSlcbiAgICByZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKVxuICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICB9XG4gIGxhc3QgPSB0XG4gIHJlcXVlc3RBbmltRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1GcmFtZShkcmF3KVxuXG5jb25zdCBzdWJtaXRMaW5lcyA9IGxpbmVzID0+IHtcbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnbGluZXMnLCBsaW5lcyB9KVxufVxuXG5jb25zdCBjb2xsZWN0U3RhdHMgPSAoKSA9PiB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG5cbiAgY29uc3QgdG90YWxSZW5kZXIgPSByZW5kZXJUaW1lcy5yZWR1Y2UoKHQsIHRvdGFsKSA9PiB0b3RhbCArIHQsIDApXG4gIGNvbnN0IGF2Z1JlbmRlciA9IHRvdGFsUmVuZGVyIC8gcmVuZGVyVGltZXMubGVuZ3RoXG4gIGNvbnN0IGZyYW1lcmF0ZSA9IE1hdGguY2VpbCgxMDAwIC8gYXZnUmVuZGVyKVxuICBwZXJmb3JtYW5jZUhpc3RvcnkucHVzaChmcmFtZXJhdGUpXG5cbiAgLy8ga2VlcCBsYXN0IDEwcyBvZiBmcmFtZXJhdGUgZGF0YSBmb3IgcGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xuICBwZXJmb3JtYW5jZUhpc3RvcnkgPSBwZXJmb3JtYW5jZUhpc3Rvcnkuc2xpY2UoLTMwKVxuXG4gIC8vIHRydW5jYXRlIGZyYW1lIGRhdGEgdG8ga2VlcCBhIHJvbGxpbmcgYXZlcmFnZVxuICByZW5kZXJUaW1lcyA9IHJlbmRlclRpbWVzLnNsaWNlKC02MClcblxuICAvLyBpZiBlbm91Z2ggdGltZSBoYXMgcGFzc2VkLCBjYWxjdWxhdGUgcmVjb21tZW5kZWQgcmVzb2x1dGlvblxuICBpZihub3cgLSBsYXN0UmVzb2x1dGlvbkNoYW5nZSA+IDEwMDApIHtcbiAgICBsYXN0UmVzb2x1dGlvbkNoYW5nZSA9IG5vd1xuXG4gICAgY29uc3QgcmVjb21tZW5kZWQgPSBNYXRoLmNlaWwoKGZyYW1lcmF0ZSAtIDE1KSAqIDQgLyAocmVmcmVzaFJhdGUgLSAxNSkpXG5cbiAgICBpZihyZWNvbW1lbmRlZCA+IDMgJiYgY2hhcnREYXRhLnJlc29sdXRpb24gPT0gMykge1xuICAgICAgaWYobWF4UmVzQ291bnQgPiAzKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gNFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF4UmVzQ291bnQgKz0gMVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYXhSZXNDb3VudCA9IDBcblxuICAgICAgLy8gZW5zdXJlIHdlJ3JlIGFpbWluZyBmb3IgcmVjb21tZW5kZWQgKy8tIDFcbiAgICAgIGlmIChyZWNvbW1lbmRlZCAtIDEgPiBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiArPSAxXG4gICAgICB9IGVsc2UgaWYgKHJlY29tbWVuZGVkICsgMSA8IGNoYXJ0RGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC09IDFcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjbGFtcCBhdCAxIC0gNFxuICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oY2hhcnREYXRhLnJlc29sdXRpb24sIDQpKVxuXG4gICAgc3RhdHMucmVzb2x1dGlvbiA9IGNoYXJ0RGF0YS5yZXNvbHV0aW9uXG4gIH1cblxuICBzdGF0cyA9IHsgLi4uc3RhdHMsIGZyYW1lcmF0ZSB9XG4gIGNoYXJ0RGF0YS5mcmFtZXJhdGUgPSBmcmFtZXJhdGVcblxuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGF0cycsIHZhbHVlOiBzdGF0cyB9KVxufVxuXG5zZXRJbnRlcnZhbChjb2xsZWN0U3RhdHMsIDMgLyAxMDApXG5cblxuXG5cbmNvbnN0IGluaXRpYWxpemUgPSBhc3luYyAoKSA9PiB7XG4gIHBvcnQub25tZXNzYWdlID0gZSA9PiB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBlXG4gICAgaWYoZGF0YSA9PSAncmVzZXQnKSB7XG4gICAgICBidWZmZXIucmVzZXQoKVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0cy5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgY2hhcnREYXRhLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBpZiAoZGF0YS51cGRhdGUgJiYgZGF0YS51cGRhdGUubGVuZ3RoID09IG1heENodW5rU2l6ZSkge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gdHJ1ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IGZhbHNlXG4gICAgICB9XG4gICAgICBidWZmZXIud3JpdGUoZGF0YS51cGRhdGUpXG4gICAgfVxuICB9XG5cbiAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdyZWFkQnVmZmVyJyB9KVxufVxuXG5cbm9ubWVzc2FnZSA9IGUgPT4ge1xuICBpZiAoZS5kYXRhLndzUG9ydCkge1xuICAgIHBvcnQgPSBlLmRhdGEud3NQb3J0XG4gICAgaW5pdGlhbGl6ZSgpXG4gIH0gZWxzZSBpZiAoZS5kYXRhID09ICdjbG9zZScpIHtcbiAgICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2Nsb3NlJyB9KVxuICB9IGVsc2Uge1xuICAgIGNoYXJ0RGF0YSA9IHsgLi4uY2hhcnREYXRhLCAuLi5lLmRhdGEgfVxuICAgIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZyBkYXRhJywgY2hhcnREYXRhKVxuICAgIGlmIChjaGFydERhdGEucGF1c2VkKSB7XG4gICAgICBidWZmZXIucGF1c2UoKVxuICAgIH0gZWxzZSB7XG4gICAgICBidWZmZXIucGxheSgpXG4gICAgfVxuICAgIGlmIChlLmRhdGEuY2FudmFzICYmIGUuZGF0YS5jYW52YXMuZ2V0Q29udGV4dCkge1xuICAgICAgY2hhcnREYXRhLmN0eCA9IGNoYXJ0RGF0YS5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gICAgfVxuICB9XG59Il0sIm5hbWVzIjpbImJ1ZmZlciIsImRyYXciLCJyZW5kZXJMaW5lIl0sIm1hcHBpbmdzIjoiOzs7RUFBQSxJQUFJQSxRQUFNLEdBQUc7RUFDYixFQUFFLE9BQU8sRUFBRSxFQUFFO0VBQ2IsRUFBRSxNQUFNLEVBQUUsRUFBRTtFQUNaLEVBQUUsTUFBTSxFQUFFLEtBQUs7RUFDZixFQUFDO0FBR0Q7QUFDQTtBQUNBQSxVQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQzlCO0VBQ0EsRUFBRUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDL0UsRUFBRUEsUUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNoRCxFQUFFLEdBQUcsQ0FBQ0EsUUFBTSxDQUFDLE1BQU0sRUFBRTtFQUNyQixJQUFJQSxRQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sR0FBRTtFQUN6QyxHQUFHO0VBQ0gsRUFBQztBQUNEQSxVQUFNLENBQUMsS0FBSyxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRTtBQUN4Q0EsVUFBTSxDQUFDLElBQUksR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHLE1BQUs7QUFDekNBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE1BQU0sR0FBRzs7RUNuQjlCLE1BQU0sTUFBTSxHQUFHO0VBQ3RCLEVBQUUsQ0FBQyxF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akMsRUFBQztBQUNEO0FBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNQyxNQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsS0FBSztFQUNuRCxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxHQUFHLFVBQVM7QUFDMUU7RUFDQSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBUztBQUNqQztFQUNBLEVBQUUsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDaEM7RUFDQTtFQUNBLEVBQUUsR0FBRyxJQUFJLEVBQUU7RUFDWCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQzNELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDM0QsR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsYUFBWTtBQUMvQjtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVU7RUFDckMsRUFBRSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsRUFBRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNB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
