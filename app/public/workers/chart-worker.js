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
    const { canvas, ctx, scale, paused, zones, bufferParams, position } = chartData;
    const { rate } = bufferParams;

    const _props = chartData.properties;
    const properties = _props.filter(x => !!x);

    let maxLinePoints = Math.min(700, Math.max(80, 20000 / (zones.length * properties.length)));
    
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
    }
  };

  let port;


  let stats = {};
  const logStats = s => stats = { ...stats, ...s };


  let renderTimes = [];

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
      if (e.data.canvas && e.data.canvas.getContext) {
        chartData.ctx = chartData.canvas.getContext("2d");
      }
    }
  };

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uZmlsdGVyKHggPT4gISF4KS5zbGljZSgtNzUwMClcbiAgYnVmZmVyLmVudHJpZXMuc29ydCgoYSwgYikgPT4gYS50aW1lIC0gYi50aW1lKVxuICBpZighYnVmZmVyLnBhdXNlZCkge1xuICAgIGJ1ZmZlci5hY3RpdmUgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzIF1cbiAgfVxufVxuYnVmZmVyLnJlc2V0ID0gKCkgPT4gYnVmZmVyLmVudHJpZXMgPSBbXVxuYnVmZmVyLnBsYXkgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gZmFsc2VcbmJ1ZmZlci5wYXVzZSA9ICgpID0+IGJ1ZmZlci5wYXVzZWQgPSB0cnVlXG4iLCJleHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn1cblxuZXhwb3J0IGNvbnN0IGRyYXdMaW5lcyA9IChwcm9wcywgY2FudmFzLCByZW5kZXJlZExpbmVzKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICBpZihyZW5kZXJlZExpbmVzW3Byb3BdKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgbGluZSA9IHJlbmRlcmVkTGluZXNbcHJvcF1baV1cbiAgICAgICAgc21vb3RoKGN0eCwgbGluZSwgbGluZUNvbG9yc1twcm9wXSwgMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG4vLyBwcm9wZXJ0aWVzIHdoaWNoIGFsbG93IG5lZ2F0aXZlIHZhbHVlc1xuY29uc3QgbmVnYXRpdmVzID0gWyAnZGV2aWF0aW9uJyBdXG5cbmNvbnN0IGdldEJpdCA9IChpbnQsIGJpdCkgPT4gISEoaW50ICYgMSA8PCBiaXQpXG5cbmNvbnN0IGdldFNldHRpbmdzID0gKHpvbmUpID0+IHtcbiAgbGV0IHNldHRpbmdzID0ge1xuICAgIGxvY2tlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDApLFxuICAgIHNlYWxlZDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDEpLFxuICAgIG9uOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMiksXG4gICAgYXV0bzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDMpLFxuICAgIHN0YW5kYnk6IGdldEJpdCh6b25lLnNldHRpbmdzLCA0KSxcbiAgICBib29zdDogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDUpLFxuICAgIHRlc3Rpbmc6IGdldEJpdCh6b25lLnNldHRpbmdzLCA2KSxcbiAgICB0ZXN0X2NvbXBsZXRlOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNylcbiAgfVxuICByZXR1cm4gc2V0dGluZ3Ncbn1cblxuXG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCkgPT4ge1xuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIC4wMSAqIHhSYW5nZSlcblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRlbGF5IC0gdGltZU9mZnNldFxuICBsZXQgcmF3WE1heCA9IHBhdXNlZCA/IGxhdGVzdC50aW1lIC0gZGVsYXkgKiAuMjUgLSB0aW1lT2Zmc2V0IDogbm93XG4gIGxldCByYXdYTWluID0gcmF3WE1heCAtIHhSYW5nZVxuXG4gIGxldCBtaWQgPSByYXdYTWluICsgeFJhbmdlIC8gMlxuICBjb25zdCBzY2FsZWQgPSB4UmFuZ2UgKiB4Wm9vbUZhY3RvciAvIDJcblxuICBjb25zdCB4TWF4ID0gbWlkICsgc2NhbGVkXG4gIGNvbnN0IHhNaW4gPSBtaWQgLSBzY2FsZWRcblxuICBjb25zdCBkWCA9IHhNYXggLSB4TWluXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICByZXR1cm4geyB4TWluLCB4TWF4LCB4UmFuZ2UsIGRYLCB4U2NhbGUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMSlcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuXG4gIC8vIGVuc3VyZSByb3VuZCBudW1iZXJzIGFyZSB1c2VkIGZvciB0aGUgc2NhbGVcbiAgY29uc3QgZXZlbiA9IGkgPT4ge1xuICAgIGlmIChtaW5BdXRvKSBtaW4gPSAtaSArIGkgKiBNYXRoLmNlaWwobWluIC8gaSlcbiAgICBpZiAobWF4QXV0bykgbWF4ID0gaSArIGkgKiBNYXRoLmZsb29yKG1heCAvIGkpXG4gIH1cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxLCAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIHJldHVybiB7IG1pblk6IG1pbiwgbWF4WTogbWF4IH1cbn1cblxuXG4vKipcbiAqIEdlbmVyYXRlIGNhbnZhcyBmcmFtZSBiYXNlZCBvbiBjdXJyZW50IGJ1ZmZlci9jb25maWdcbiAqIEBwYXJhbSB7T2JqZWN0fSBjaGFydERhdGEgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsb2dTdGF0cyBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHN1Ym1pdExpbmVzIFxuICovXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKSA9PiB7XG4gIGNvbnN0IHsgY2FudmFzLCBjdHgsIHNjYWxlLCBwYXVzZWQsIHpvbmVzLCBidWZmZXJQYXJhbXMsIHBvc2l0aW9uIH0gPSBjaGFydERhdGFcbiAgY29uc3QgeyByYXRlIH0gPSBidWZmZXJQYXJhbXNcblxuICBjb25zdCBfcHJvcHMgPSBjaGFydERhdGEucHJvcGVydGllc1xuICBjb25zdCBwcm9wZXJ0aWVzID0gX3Byb3BzLmZpbHRlcih4ID0+ICEheClcblxuICBsZXQgbWF4TGluZVBvaW50cyA9IE1hdGgubWluKDcwMCwgTWF0aC5tYXgoODAsIDIwMDAwIC8gKHpvbmVzLmxlbmd0aCAqIHByb3BlcnRpZXMubGVuZ3RoKSkpXG4gIFxuICBjb25zdCB7IHhNaW4sIHhNYXgsIGRYLCB4U2NhbGUgfSA9IGdldFhQYXJhbWV0ZXJzKHBvc2l0aW9uLCBjYW52YXMsIHNjYWxlLCBwYXVzZWQpXG5cbiAgY29uc3QgcmVuZGVyTGltaXQgPSB4TWluIC0gMjAwMFxuICBjb25zdCBzYW1wbGUgPSBidWZmZXIuYWN0aXZlLmZpbHRlcih4ID0+IHgudGltZSA+PSByZW5kZXJMaW1pdClcblxuICAvLyBkZXRlcm1pbmUgd2hpY2ggcG9pbnRzIHNob3VsZCBiZSBmaWx0ZXJlZCBiYXNlZCBvbiBtYXggcG9pbnRzIHBlciBsaW5lXG4gIGNvbnN0IG1pbk1TSW50ZXJ2YWwgPSBkWCAvIG1heExpbmVQb2ludHNcblxuICBjb25zdCByZW5kZXJlZCA9IHNhbXBsZS5maWx0ZXIoeCA9PiB7XG4gICAgY29uc3QgdmFsaWRUaW1lID0gKHgudGltZSAtIDE2MTQ3OTkxNjAwMDApICUgbWluTVNJbnRlcnZhbCA8IDIwMDAgLyByYXRlXG4gICAgcmV0dXJuIHggPT0gc2FtcGxlWzBdIHx8IHggPT0gc2FtcGxlW3NhbXBsZS5sZW5ndGggLSAxXSB8fCB2YWxpZFRpbWVcbiAgfSlcblxuXG4gIC8vIHJlbmRlcmVkLnJldmVyc2UoKVxuXG4gIGxldCBsaW5lcyA9IHt9XG4gIGxldCByZW5kZXJlZExpbmVzID0ge31cblxuICBsZXQgbWF4ID0ge31cbiAgbGV0IG1pbiA9IHt9XG4gIGxldCBhdmcgPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cbiAgbGV0IHlWYWx1ZXMgPSB7fVxuICBsZXQgdG90YWxQb2ludHMgPSAwXG4gIGNvbnN0IG9mZnNldFkgPSBwb3NpdGlvbi5wYW5ZXG5cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gICAgem9uZXMuZm9yRWFjaCh4ID0+IGxpbmVzW3Byb3BdW3ggLSAxXSA9IFtdKVxuXG5cbiAgICAvLyBjYWxjdWxhdGUgeCB2YWx1ZXMgaW4gcGl4ZWxzLCBnYXRoZXIgeSBheGlzIGRhdGFcbiAgICBmb3IgKGxldCBmcmFtZSBvZiByZW5kZXJlZCkge1xuICAgICAgY29uc3QgeCA9IChmcmFtZS50aW1lIC0geE1pbikgKiB4U2NhbGVcblxuICAgICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgICBjb25zdCBwb2ludCA9IGZyYW1lLmRhdGFbeiAtIDFdXG5cbiAgICAgICAgbGV0IHkgPSBwb2ludFtwcm9wXVxuICAgICAgICBpZiAocHJvcCA9PSAnZGV2aWF0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MocG9pbnQpXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm1hbnVhbCkge1xuICAgICAgICAgICAgeSA9IHBvaW50Lm1hbnVhbF9zcCAtIHBvaW50LmFjdHVhbF9wZXJjZW50XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC50ZW1wX3NwIC0gcG9pbnQuYWN0dWFsX3RlbXBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGluZXNbcHJvcF1beiAtIDFdLnB1c2goeyB4LCB5IH0pXG4gICAgICAgIG1heFtwcm9wXSA9IE1hdGgubWF4KG1heFtwcm9wXSwgeSlcbiAgICAgICAgbWluW3Byb3BdID0gTWF0aC5taW4obWluW3Byb3BdLCB5KVxuICAgICAgfVxuICAgIH1cblxuXG4gICAgY29uc3Qgc2NhbGVQYXJhbXMgPSBzY2FsZS55W3Byb3BdXG4gICAgY29uc3QgeyBtaW5ZLCBtYXhZIH0gPSBnZXRZUGFyYW1ldGVycyhwcm9wLCBtaW5bcHJvcF0sIG1heFtwcm9wXSwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKVxuXG4gICAgbWluW3Byb3BdID0gbWluWVxuICAgIG1heFtwcm9wXSA9IG1heFlcblxuICAgIC8vIGVzdGFibGlzaCBwaXhlbCB0byB1bml0IHJhdGlvXG4gICAgYXV0b1NjYWxlW3Byb3BdID0gY2FudmFzLmhlaWdodCAvIChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pXG5cblxuICAgIHJlbmRlcmVkTGluZXNbcHJvcF0gPSBbXVxuICAgIHlWYWx1ZXNbcHJvcF0gPSB7XG4gICAgICB0b3RhbDogMCxcbiAgICAgIHRvdGFsUG9pbnRzOiAwXG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHkgcGl4ZWwgdmFsdWVzIGJhc2VkIG9uIGVzdGFibGlzaGVkIHNjYWxlXG4gICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzW3Byb3BdLmZpbHRlcih4ID0+ICEheCkpIHtcbiAgICAgIGxldCByZW5kZXJlZExpbmUgPSBbXVxuICAgICAgXG4gICAgICBmb3IgKGxldCBwb2ludCBvZiBsaW5lKSB7XG4gICAgICAgIHlWYWx1ZXNbcHJvcF0udG90YWwgKz0gcG9pbnQueVxuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzICs9IDFcbiAgICAgICAgcG9pbnQueSA9IG9mZnNldFkgKyBwYXJzZUludChjYW52YXMuaGVpZ2h0IC0gKHBvaW50LnkgLSBtaW5bcHJvcF0pICogYXV0b1NjYWxlW3Byb3BdKVxuICAgICAgICByZW5kZXJlZExpbmUucHVzaChwb2ludClcbiAgICAgICAgdG90YWxQb2ludHMrK1xuICAgICAgfVxuICAgICAgXG4gICAgICByZW5kZXJlZExpbmVzW3Byb3BdLnB1c2gocmVuZGVyZWRMaW5lKVxuICAgIH1cblxuICAgIGF2Z1twcm9wXSA9IHlWYWx1ZXNbcHJvcF0udG90YWwgLyB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzXG4gIH1cblxuXG4gIGlmKGNhbnZhcyAmJiBjdHgpIHtcbiAgICBkcmF3TGluZXMoX3Byb3BzLCBjYW52YXMsIHJlbmRlcmVkTGluZXMpXG4gIH0gZWxzZSB7XG4gICAgc3VibWl0TGluZXMocmVuZGVyZWRMaW5lcylcbiAgfVxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQ6IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aCwgeE1heCwgeE1pbiB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBkcmF3IiwiZXhwb3J0IGNvbnN0IG1heENodW5rU2l6ZSA9IDEwMFxuXG5sZXQgcGFyYW1zID0ge1xuICByYXRlOiAxMFxufVxuXG5sZXQgYnVmZmVyID0gW11cblxuXG4vLyBlbnN1cmUgYnVmZmVyIGlzIG5ldmVyIGZpbGxlZCBmYXN0ZXIgdGhhbiB0aGUgc3BlY2lmaWVkIHJhdGVcbmNvbnN0IHRyeVB1c2ggPSAoZnJhbWUpID0+IHtcbiAgZnJhbWUudHMgPSBmcmFtZS50aW1lLmdldFRpbWUoKVxuICBjb25zdCBsYXN0RnJhbWUgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG4gIGlmKCFsYXN0RnJhbWUpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgICByZXR1cm5cbiAgfVxuICAvLyBtaW4gaW50ZXJ2YWwgaXMgbWluIG1zIGJldHdlZW4gZnJhbWVzIHdpdGggNW1zIHBhZGRpbmdcbiAgY29uc3QgbWluSW50dmwgPSAxMDAwIC8gcGFyYW1zLnJhdGUgKyA1XG4gIGlmKGZyYW1lLnRpbWUgLSBsYXN0RnJhbWUudGltZSA+PSBtaW5JbnR2bCkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbiAoeyB0cywgZGF0YSB9KSB7XG5cbiAgLy8gc2ltdWxhdGUgNDUwIHpvbmVzXG4gIC8vIGRhdGEgPSBkYXRhLmNvbmNhdChkYXRhKS5jb25jYXQoZGF0YSlcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUodHMpXG4gIGNvbnN0IGZyYW1lID0geyBkYXRhLCBkYXRlLCB0aW1lOiB0cyB9XG5cbiAgdHJ5UHVzaChmcmFtZSlcbiAgLy8gdHdlZW4oZnJhbWUsIDEyKVxuXG4gIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgtNzUwMClcbn1cblxuXG5sZXQgaW50ZXJ2YWxzID0ge31cbmxldCBsYXRlc3QgPSB7fVxubGV0IGVhcmxpZXN0ID0ge31cbmxldCBuZWVkc1Jlc2V0ID0ge31cblxuZXhwb3J0IGNvbnN0IGJ1ZmZlckNvbW1hbmRzID0gKHBvcnQsIGUsIGlkKSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuXG4gIGNvbnN0IHBvc3QgPSAoZGF0YSkgPT4ge1xuICAgIGlmKHBvcnQpIHtcbiAgICAgIHBvcnQucG9zdE1lc3NhZ2UoZGF0YSkgXG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgfVxuICB9XG4gIFxuICBpZiAoZGF0YS5jb21tYW5kID09ICdyZWFkQnVmZmVyJykge1xuXG4gICAgLy8gc2VuZCBkYXRhIGluIGJhdGNoZXMsIGxpbWl0aW5nIG1heCB0byBhdm9pZCBPT00gd2hlbiBzZXJpYWxpemluZyB0b1xuICAgIC8vIHBhc3MgYmV0d2VlbiB0aHJlYWRzXG4gICAgY29uc3Qgc2VuZENodW5rID0gKCkgPT4ge1xuICAgICAgY29uc3QgcmVzZXRCdWZmZXIgPSAoKSA9PiB7XG4gICAgICAgIGxhdGVzdFtpZF0gPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdICYmIGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0udHNcbiAgICAgICAgZWFybGllc3RbaWRdID0gbGF0ZXN0W2lkXSArIDFcbiAgICAgICAgbmVlZHNSZXNldFtpZF0gPSBmYWxzZVxuICAgICAgfVxuICAgICAgaWYgKCFsYXRlc3RbaWRdICYmIGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgcmVzZXRCdWZmZXIoKVxuICAgICAgfVxuXG4gICAgICBpZihuZWVkc1Jlc2V0W2lkXSkge1xuICAgICAgICBwb3N0KCdyZXNldCcpXG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKGxhdGVzdFtpZF0pIHtcbiAgICAgICAgY29uc3QgbmV3ZXN0ID0gYnVmZmVyLmZpbHRlcih4ID0+IHgudHMgPiBsYXRlc3RbaWRdKVxuICAgICAgICBjb25zdCBiYWNrRmlsbCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzIDwgZWFybGllc3RbaWRdKS5zbGljZSgtKG1heENodW5rU2l6ZSAtIG5ld2VzdC5sZW5ndGgpKVxuICAgICAgICBjb25zdCB1cGRhdGUgPSBiYWNrRmlsbC5jb25jYXQobmV3ZXN0KVxuICAgICAgICBpZiAodXBkYXRlLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IGxhdGVzdEVudHJ5ID0gdXBkYXRlW3VwZGF0ZS5sZW5ndGggLSAxXVxuICAgICAgICAgIGNvbnN0IGZpcnN0RW50cnkgPSB1cGRhdGVbMF1cbiAgICAgICAgICBsYXRlc3RbaWRdID0gbGF0ZXN0RW50cnkudGltZVxuICAgICAgICAgIGlmKGZpcnN0RW50cnkudGltZSA8IGVhcmxpZXN0W2lkXSkgZWFybGllc3RbaWRdID0gZmlyc3RFbnRyeS50aW1lXG4gICAgICAgICAgcG9zdCh7IHVwZGF0ZSwgcGFyYW1zIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKHNpemVPZihbIC4uLmJ1ZmZlciBdKSlcbiAgICB9XG5cbiAgICBpbnRlcnZhbHNbaWRdID0gc2V0SW50ZXJ2YWwoc2VuZENodW5rLCAyMDApXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdzZXRCdWZmZXJQYXJhbXMnKSB7XG4gICAgbGV0IHJlc2V0ID0gZmFsc2VcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBwYXJhbXMnLCBkYXRhLnBhcmFtcylcbiAgICBmb3IobGV0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhLnBhcmFtcykpIHtcbiAgICAgIGlmKGRhdGEucGFyYW1zW2tleV0gIT0gcGFyYW1zW2tleV0pIHtcbiAgICAgICAgcmVzZXQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIHBhcmFtcyA9IHsgLi4ucGFyYW1zLCAuLi5kYXRhLnBhcmFtcyB8fCB7fX1cbiAgICBpZihyZXNldCkge1xuICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIDApXG4gICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMobmVlZHNSZXNldCkpIHtcbiAgICAgICAgbmVlZHNSZXNldFtrZXldID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiBuZXcgRGF0ZSh1cGRhdGVkVFMpLCB0czogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2gobmV4dCksIDUwMClcbn1cblxuXG5cbmNvbnN0IHR5cGVTaXplcyA9IHtcbiAgXCJ1bmRlZmluZWRcIjogKCkgPT4gMCxcbiAgXCJib29sZWFuXCI6ICgpID0+IDQsXG4gIFwibnVtYmVyXCI6ICgpID0+IDgsXG4gIFwic3RyaW5nXCI6IGl0ZW0gPT4gMiAqIGl0ZW0ubGVuZ3RoLFxuICBcIm9iamVjdFwiOiBpdGVtID0+ICFpdGVtID8gMCA6IE9iamVjdFxuICAgIC5rZXlzKGl0ZW0pXG4gICAgLnJlZHVjZSgodG90YWwsIGtleSkgPT4gc2l6ZU9mKGtleSkgKyBzaXplT2YoaXRlbVtrZXldKSArIHRvdGFsLCAwKVxufVxuXG5jb25zdCBzaXplT2YgPSB2YWx1ZSA9PiB0eXBlU2l6ZXNbdHlwZW9mIHZhbHVlXSh2YWx1ZSkiLCJpbXBvcnQgcmVuZGVyTGluZSBmcm9tICcuL2xpbmUtcGxvdCdcbmltcG9ydCBidWZmZXIgZnJvbSAnLi9idWZmZXInXG5pbXBvcnQgeyBtYXhDaHVua1NpemUgfSBmcm9tICcuLi9yZWFsdGltZS9idWZmZXInXG5cbmxldCByZXF1ZXN0QW5pbUZyYW1lXG50cnkge1xuICByZXF1ZXN0QW5pbUZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG59IGNhdGNoKGUpIHtcbiAgdHJ5IHtcbiAgICByZXF1ZXN0QW5pbUZyYW1lID0gd2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIH0gY2F0Y2goZSkge1xuICAgIHRyeSB7XG4gICAgICByZXF1ZXN0QW5pbUZyYW1lID0gbW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICByZXF1ZXN0QW5pbUZyYW1lID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9uICovIGNhbGxiYWNrLCAvKiBET01FbGVtZW50ICovIGVsZW1lbnQpIHtcbiAgICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfSxcbiAgYnVmZmVyUGFyYW1zOiB7XG4gICAgcmF0ZTogMTBcbiAgfVxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3NjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiwgb2Zmc2V0czogc3RhdHMub2Zmc2V0cyB9fSlcbiAgICByZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKVxuICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICB9XG4gIGxhc3QgPSB0XG4gIHJlcXVlc3RBbmltRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1GcmFtZShkcmF3KVxuXG5jb25zdCBzdWJtaXRMaW5lcyA9IGxpbmVzID0+IHtcbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnbGluZXMnLCBsaW5lcyB9KVxufVxuXG5jb25zdCBjb2xsZWN0U3RhdHMgPSAoKSA9PiB7XG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLmNlaWwoMTAwMCAvIGF2Z1JlbmRlcilcbiAgcmVuZGVyVGltZXMgPSByZW5kZXJUaW1lcy5zbGljZSgtNTApXG5cbiAgc3RhdHMgPSB7IC4uLnN0YXRzLCBmcmFtZXJhdGUgfVxuICBjaGFydERhdGEuZnJhbWVyYXRlID0gZnJhbWVyYXRlXG5cbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RhdHMnLCB2YWx1ZTogc3RhdHMgfSlcbn1cblxuc2V0SW50ZXJ2YWwoY29sbGVjdFN0YXRzLCAzIC8gMTAwKVxuXG5cblxuXG5jb25zdCBpbml0aWFsaXplID0gYXN5bmMgKCkgPT4ge1xuICBwb3J0Lm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuICAgIGlmKGRhdGEgPT0gJ3Jlc2V0Jykge1xuICAgICAgYnVmZmVyLnJlc2V0KClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGNoYXJ0RGF0YS5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgaWYgKGRhdGEudXBkYXRlICYmIGRhdGEudXBkYXRlLmxlbmd0aCA9PSBtYXhDaHVua1NpemUpIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSBmYWxzZVxuICAgICAgfVxuICAgICAgYnVmZmVyLndyaXRlKGRhdGEudXBkYXRlKVxuICAgIH1cbiAgfVxuXG4gIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAncmVhZEJ1ZmZlcicgfSlcbn1cblxuXG5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgaWYgKGUuZGF0YS53c1BvcnQpIHtcbiAgICBwb3J0ID0gZS5kYXRhLndzUG9ydFxuICAgIGluaXRpYWxpemUoKVxuICB9IGVsc2UgaWYgKGUuZGF0YSA9PSAnY2xvc2UnKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjbG9zZScgfSlcbiAgfSBlbHNlIHtcbiAgICBjaGFydERhdGEgPSB7IC4uLmNoYXJ0RGF0YSwgLi4uZS5kYXRhIH1cbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgZGF0YScsIGNoYXJ0RGF0YSlcbiAgICBpZiAoY2hhcnREYXRhLnBhdXNlZCkge1xuICAgICAgYnVmZmVyLnBhdXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyLnBsYXkoKVxuICAgIH1cbiAgICBpZiAoZS5kYXRhLmNhbnZhcyAmJiBlLmRhdGEuY2FudmFzLmdldENvbnRleHQpIHtcbiAgICAgIGNoYXJ0RGF0YS5jdHggPSBjaGFydERhdGEuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJidWZmZXIiLCJkcmF3IiwicmVuZGVyTGluZSJdLCJtYXBwaW5ncyI6Ijs7O0VBQUEsSUFBSUEsUUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7QUFDQUEsVUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksRUFBRTtFQUM5QjtFQUNBLEVBQUVBLFFBQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQy9FLEVBQUVBLFFBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDaEQsRUFBRSxHQUFHLENBQUNBLFFBQU0sQ0FBQyxNQUFNLEVBQUU7RUFDckIsSUFBSUEsUUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEdBQUU7RUFDekMsR0FBRztFQUNILEVBQUM7QUFDREEsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsT0FBTyxHQUFHLEdBQUU7QUFD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RyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBQztBQUM1RjtFQUNBLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUk7RUFDcEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSTtBQUNwQjtFQUNBO0VBQ0EsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDO0FBQzdEO0FBQ0E7RUFDQSxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFFO0VBQzVCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHO0VBQ3BCLE1BQU0sS0FBSyxFQUFFLENBQUM7RUFDZCxNQUFNLFdBQVcsRUFBRSxDQUFDO0VBQ3BCLE1BQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNsRCxNQUFNLElBQUksWUFBWSxHQUFHLEdBQUU7RUFDM0I7RUFDQSxNQUFNLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO0VBQzlCLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsRUFBQztFQUN0QyxRQUFRLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksRUFBQztFQUN0QyxRQUFRLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQzdGLFFBQVEsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDaEMsUUFBUSxXQUFXLEdBQUU7RUFDckIsT0FBTztFQUNQO0VBQ0EsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBQztFQUM1QyxLQUFLO0FBQ0w7RUFDQSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFXO0VBQy9ELEdBQUc7QUFDSDtBQUNBO0VBQ0EsRUFBRSxHQUFHLE1BQU0sSUFBSSxHQUFHLEVBQUU7RUFDcEIsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUM7RUFDNUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxXQUFXLENBQUMsYUFBYSxFQUFDO0VBQzlCLEdBQUc7QUFDSDtFQUNBLEVBQUUsUUFBUSxDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHQSxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUM7RUFDeEc7O0VDcE9PLE1BQU0sWUFBWSxHQUFHLElBQUc7QUFDL0I7RUFDQSxJQUFJLE1BQU0sR0FBRztFQUNiLEVBQUUsSUFBSSxFQUFFLEVBQUU7RUFDVixFQUFDO0FBQ0Q7RUFDQSxJQUFJLE1BQU0sR0FBRyxHQUFFO0FBQ2Y7QUFDQTtFQUNBO0VBQ0EsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEtBQUs7RUFDM0IsRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFFO0VBQ2pDLEVBQUUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0VBQzdDLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRTtFQUNqQixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0VBQ3RCLElBQUksTUFBTTtFQUNWLEdBQUc7RUFDSDtFQUNBLEVBQUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBQztFQUN6QyxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxJQUFJLFFBQVEsRUFBRTtFQUM5QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0VBQ3RCLEdBQUc7RUFDSCxFQUFDO0FBR0Q7RUFDQSxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUU7QUFDdkM7RUFDQTtFQUNBO0FBQ0E7RUFDQSxFQUFFLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBQztFQUMzQixFQUFFLE1BQU0sS0FBSyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFFO0FBQ3hDO0VBQ0EsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFDO0VBQ2hCO0FBQ0E7RUFDQSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQzlCOztFQ2xDQSxJQUFJLGlCQUFnQjtFQUNwQixJQUFJO0VBQ0osRUFBRSxnQkFBZ0IsR0FBRyxzQkFBcUI7RUFDMUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0VBQ1gsRUFBRSxJQUFJO0VBQ04sSUFBSSxnQkFBZ0IsR0FBRyw0QkFBMkI7RUFDbEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0VBQ2IsSUFBSSxJQUFJO0VBQ1IsTUFBTSxnQkFBZ0IsR0FBRyx5QkFBd0I7RUFDakQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0VBQ2YsTUFBTSxnQkFBZ0IsR0FBRyx5QkFBeUIsUUFBUSxtQkFBbUIsT0FBTyxFQUFFO0VBQ3RGLFFBQVEsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFDO0VBQ3ZDLFFBQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztFQUNILENBQUM7QUFDRDtBQUNBO0FBQ0E7RUFDQSxNQUFNLFNBQVMsR0FBRztFQUNsQixFQUFFLE1BQU0sRUFBRUUsTUFBVTtFQUNwQixFQUFDO0FBQ0Q7RUFDQSxJQUFJLFNBQVMsR0FBRztFQUNoQixFQUFFLE1BQU0sRUFBRSxJQUFJO0VBQ2QsRUFBRSxHQUFHLEVBQUUsSUFBSTtFQUNYLEVBQUUsSUFBSSxFQUFFLEVBQUU7RUFDVixFQUFFLFVBQVUsRUFBRSxFQUFFO0VBQ2hCLEVBQUUsS0FBSyxFQUFFO0VBQ1QsSUFBSSxDQUFDLEVBQUUsRUFBRTtFQUNULElBQUksQ0FBQyxFQUFFLE1BQU07RUFDYixHQUFHO0VBQ0gsRUFBRSxZQUFZLEVBQUU7RUFDaEIsSUFBSSxJQUFJLEVBQUUsRUFBRTtFQUNaLEdBQUc7RUFDSCxFQUFDO0FBQ0Q7RUFDQSxJQUFJLEtBQUk7QUFDUjtBQUNBO0VBQ0EsSUFBSSxLQUFLLEdBQUcsR0FBRTtFQUNkLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRTtBQUNoRDtBQUNBO0VBQ0EsSUFBSSxXQUFXLEdBQUcsR0FBRTtBQUNwQjtFQUNBLElBQUksSUFBSSxHQUFHLEVBQUM7RUFDWixNQUFNLElBQUksR0FBRyxNQUFNO0VBQ25CLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEdBQUU7RUFDaEMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDakMsSUFBSSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBQztFQUN4RyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUM7RUFDL0QsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFDO0VBQ2pELEdBQUc7RUFDSCxFQUFFLElBQUksR0FBRyxFQUFDO0VBQ1YsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUM7RUFDeEIsRUFBQztBQUNEO0VBQ0EsZ0JBQWdCLENBQUMsSUFBSSxFQUFDO0FBQ3RCO0VBQ0EsTUFBTSxXQUFXLEdBQUcsS0FBSyxJQUFJO0VBQzdCLEVBQUUsV0FBVyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBQztFQUN2QyxFQUFDO0FBQ0Q7RUFDQSxNQUFNLFlBQVksR0FBRyxNQUFNO0VBQzNCLEVBQUUsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDcEUsRUFBRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU07RUFDcEQsRUFBRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUM7RUFDL0MsRUFBRSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBQztBQUN0QztFQUNBLEVBQUUsS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsU0FBUyxHQUFFO0VBQ2pDLEVBQUUsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFTO0FBQ2pDO0VBQ0EsRUFBRSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBQztFQUM5QyxFQUFDO0FBQ0Q7RUFDQSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUM7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7RUFDQSxNQUFNLFVBQVUsR0FBRyxZQUFZO0VBQy9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDeEIsSUFBSSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQztFQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUN4QixNQUFNRixRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU0sS0FBSyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTTtFQUN0QyxNQUFNLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDMUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksWUFBWSxFQUFFO0VBQzdELFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFJO0VBQzVCLE9BQU8sTUFBTTtFQUNiLFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFLO0VBQzdCLE9BQU87RUFDUCxNQUFNQSxRQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBQztFQUM3QyxFQUFDO0FBQ0Q7QUFDQTtFQUNBLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDakIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTTtFQUN4QixJQUFJLFVBQVUsR0FBRTtFQUNoQixHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUNoQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUM7RUFDMUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxTQUFTLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUU7RUFDM0M7RUFDQSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtFQUMxQixNQUFNQSxRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU1BLFFBQU0sQ0FBQyxJQUFJLEdBQUU7RUFDbkIsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUU7RUFDbkQsTUFBTSxTQUFTLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksRUFBQztFQUN2RCxLQUFLO0VBQ0wsR0FBRztFQUNIOzs7Ozs7In0=
