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
      if (typeof f == 'undefined') f = 0.3;
      if (typeof t == 'undefined') t = 0.6;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      var m = 0;
      var dx1 = 0;
      var dy1 = 0;
      let dx2 = 0;
      let dy2 = 0;

      var preP = points[0];
      for (var i = 1; i < points.length; i++) {
        var curP = points[i];
        const nexP = points[i + 1];
        if (nexP) {
          m = gradient(preP, nexP);
          dx2 = (nexP.x - curP.x) * -f;
          dy2 = dx2 * m * t;
        } else {
          dx2 = 0;
          dy2 = 0;
        }
        ctx.bezierCurveTo(preP.x - dx1, preP.y - dy1, curP.x + dx2, curP.y + dy2, curP.x, curP.y);
        dx1 = dx2;
        dy1 = dy2;
        preP = curP;
      }
      // ctx.stroke();
    }
    bzCurve(points, .3, 1);
    ctx.stroke();
  }



  const drawLines = (props, canvas, { renderedLines, selected }) => {
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
          smooth(ctx, line, lineColors[prop], i == selected ? 3 : 1);
        }
      }
    }
  };

  const getInspectionDetails = (mode, zones, inspectPoint, rendered, canvas, xMin, timeRange, position) => {

    const [ xBase, yBase ] = inspectPoint;

    const x = canvas.width * (xBase - xMin) / timeRange;
    const y = position.panY - yBase / position.zoomY;

    let data = {
      zone: -1,
      point: { x: -1, y: -1 },
      index: -1,
      pointIndex: -1
    };

    if(mode != 'inspect') return data

    let selectedDistance;

    let stamp1, stamp2;

    for(let [ property, lines ] of Object.entries(rendered)) {
      for(let line of lines) {

        // find closest x values on either side of inspected x
        if(!stamp1) {
          let last;
          for (let point of line) {
            if(point.time > xBase && last) {
              stamp1 = last.x;
              stamp2 = point.x;
              data.pointIndex = line.indexOf(point);
              break
            }
            last = { ...point };
          }
        }
        
        const p1 = line.find(p => p.x == stamp1);
        const p2 = line.find(p => p.x == stamp2);

        if(p1 && p2) {
          // const totalYOffset = Math.abs(y - p1.y) + Math.abs(p2.y - y)
          
          const d = minDistance(p1, p2, { x, y });
          // log(d)
          if(d < selectedDistance || selectedDistance === undefined) {
            data.index = lines.indexOf(line);
            data.zone = zones[data.index];
            data.point = closest(p1, p2, { x, y });
            data.property = property;
            selectedDistance = d;
          }
        }
      }
    }
    // log(selectedZone)

    return data
  };

  const closest = (p1, p2, target) => {
    const dX1 = Math.abs(p1.x - target.x);
    const dX2 = Math.abs(p2.x - target.x);
    return dX1 > dX2 ? p2 : p1
  };

  // calculate distance of inspection point from line segment
  const minDistance = (l1, l2, p) => {
    return Math.min(Math.hypot(l1.x - p.x, l1.y - p.y), Math.hypot(l2.x - p.x, l1.y - p.y))
    // const n = Math.abs((l2.x - l1.x) * (l1.y - p.y) - (l1.x - p.x) * (l2.y - l1.y))
    // const d = Math.sqrt(Math.pow(l2.x - l1.x, 2) + Math.pow(l2.y - l1.y, 2))
    // return n / d
  };

  /**
   * Generate canvas frame based on current buffer/config
   * @param {Object} chartData 
   * @param {Function} logStats 
   * @param {Function} submitLines 
   */
  const draw$1 = (chartData, logStats, submitLines) => {
    const { canvas, ctx, scale, paused, bufferParams, position, mode, inspectedPoint } = chartData;

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
    
    const { xMin, xMax, dX, xScale, valid, xRange } = getXParameters(position, canvas, scale, paused);
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
          lines[prop][z - 1].push({ x, y, time: frame.time });
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


    let inspectionDetails = getInspectionDetails(mode, zones, inspectedPoint, renderedLines, canvas, xRange, xMin, position);
    inspectionDetails.frame = getFrame(rendered, inspectionDetails.pointIndex, inspectionDetails.zone);

    const selected = [ inspectionDetails.index ];

    if(canvas && ctx) {
      drawLines(_props, canvas, { renderedLines, selected });
    } else {
      submitLines({ renderedLines, selected });
    }

    const plotFilled = sample.length < buffer$1.active.length;

    logStats({ totalPoints, max, min, avg, plotFilled, inspectionDetails, xMax, xMin });
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

  const getFrame = (rendered, idx, zone) => {
    // console.log(idx, zone, rendered.length)
    const frame = rendered[idx];
    // console.log(frame)
    if(!frame) return {}
    return frame.data[zone - 1]
  };

  // get the x axis bounds
  const getXParameters = (position, canvas, scale, paused) => {
    const latest = buffer$1.active[buffer$1.active.length - 1];
    if (!latest) return { valid: false }

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

    const scaledMin = min;
    const scaledMax = max;

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

    const maxOffset = scaledMax - max / (max - min);
    const minOffset = scaledMin - min / (max - min);

    return { minY: min, maxY: max, maxOffset, minOffset }
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
      postMessage({ type: 'scale', value: { xMax: stats.xMax, xMin: stats.xMin, offsets: stats.offsets, inspection: stats.inspectionDetails }});
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

  setInterval(collectStats, 1000 / 3);




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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvaW5zcGVjdGlvbi5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2xpbmUtcGxvdC5qcyIsIi4uLy4uL3NyYy9kYXRhL3JlYWx0aW1lL2J1ZmZlci5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2NoYXJ0LXdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYnVmZmVyID0ge1xuICBlbnRyaWVzOiBbXSxcbiAgYWN0aXZlOiBbXSxcbiAgcGF1c2VkOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZycsIGRhdGEpXG4gIGJ1ZmZlci5lbnRyaWVzID0gWyAuLi5idWZmZXIuZW50cmllcywgLi4uZGF0YSBdLmZpbHRlcih4ID0+ICEheCkuc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgMTogJyNBMTAzRkYnLFxuICAyOiAnI0ZGOUMwMycsXG4gIDM6ICcjMDNDRkZGJyxcbiAgNDogJyMyRTAzRkYnXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNtb290aChjdHgsIHBvaW50cywgY29sb3IsIHdpZHRoKSB7XG4gIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yXG4gIGN0eC5saW5lV2lkdGggPSB3aWR0aFxuICAvLyBjdHguc3Ryb2tlUmVjdCgyMCwgMjAsIDE1MCwgMTAwKVxuXG4gIGN0eC5iZWdpblBhdGgoKVxuICBpZiAocG9pbnRzID09IHVuZGVmaW5lZCB8fCBwb2ludHMubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDEpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDIpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1sxXS54LCBwb2ludHNbMV0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYocG9pbnRzLmxlbmd0aCA8IDMpIHJldHVyblxuICAvLyBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gIC8vICAgLy8gY3R4LmxpbmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnkpXG4gIC8vICAgdmFyIHhjID0gKHBvaW50c1tpXS54ICsgcG9pbnRzW2kgKyAxXS54KSAvIDJcbiAgLy8gICB2YXIgeWMgPSAocG9pbnRzW2ldLnkgKyBwb2ludHNbaSArIDFdLnkpIC8gMlxuICAvLyAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAvLyAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgeGMsIHljKVxuICAvLyB9XG4gIC8vIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgcG9pbnRzW2kgKyAxXS54LCBwb2ludHNbaSArIDFdLnkpXG5cbiAgZnVuY3Rpb24gZ3JhZGllbnQoYSwgYikge1xuICAgIHJldHVybiAoYi55IC0gYS55KSAvIChiLnggLSBhLngpXG4gIH1cblxuICBmdW5jdGlvbiBiekN1cnZlKHBvaW50cywgZiwgdCkge1xuICAgIC8vZiA9IDAsIHdpbGwgYmUgc3RyYWlnaHQgbGluZVxuICAgIC8vdCBzdXBwb3NlIHRvIGJlIDEsIGJ1dCBjaGFuZ2luZyB0aGUgdmFsdWUgY2FuIGNvbnRyb2wgdGhlIHNtb290aG5lc3MgdG9vXG4gICAgaWYgKHR5cGVvZiBmID09ICd1bmRlZmluZWQnKSBmID0gMC4zXG4gICAgaWYgKHR5cGVvZiB0ID09ICd1bmRlZmluZWQnKSB0ID0gMC42XG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcblxuICAgIHZhciBtID0gMFxuICAgIHZhciBkeDEgPSAwXG4gICAgdmFyIGR5MSA9IDBcbiAgICBsZXQgZHgyID0gMFxuICAgIGxldCBkeTIgPSAwXG5cbiAgICB2YXIgcHJlUCA9IHBvaW50c1swXVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyUCA9IHBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4UCA9IHBvaW50c1tpICsgMV1cbiAgICAgIGlmIChuZXhQKSB7XG4gICAgICAgIG0gPSBncmFkaWVudChwcmVQLCBuZXhQKVxuICAgICAgICBkeDIgPSAobmV4UC54IC0gY3VyUC54KSAqIC1mXG4gICAgICAgIGR5MiA9IGR4MiAqIG0gKiB0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkeDIgPSAwXG4gICAgICAgIGR5MiA9IDBcbiAgICAgIH1cbiAgICAgIGN0eC5iZXppZXJDdXJ2ZVRvKHByZVAueCAtIGR4MSwgcHJlUC55IC0gZHkxLCBjdXJQLnggKyBkeDIsIGN1clAueSArIGR5MiwgY3VyUC54LCBjdXJQLnkpXG4gICAgICBkeDEgPSBkeDJcbiAgICAgIGR5MSA9IGR5MlxuICAgICAgcHJlUCA9IGN1clBcbiAgICB9XG4gICAgLy8gY3R4LnN0cm9rZSgpO1xuICB9XG4gIGJ6Q3VydmUocG9pbnRzLCAuMywgMSlcbiAgY3R4LnN0cm9rZSgpXG59XG5cblxuXG5leHBvcnQgY29uc3QgZHJhd0xpbmVzID0gKHByb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQgfSkgPT4ge1xuICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW3Byb3BzWzBdXTogY29sb3JzWzFdLFxuICAgIFtwcm9wc1sxXV06IGNvbG9yc1syXSxcbiAgICBbcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW3Byb3BzWzNdXTogY29sb3JzWzRdXG4gIH1cblxuICAvLyBjbGVhciBjYW52YXMgZm9yIG5ldyBmcmFtZVxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BzKSB7XG4gICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZW5kZXJlZExpbmVzW3Byb3BdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSByZW5kZXJlZExpbmVzW3Byb3BdW2ldXG4gICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIGkgPT0gc2VsZWN0ZWQgPyAzIDogMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJsZXQgbiA9IDBcblxuZXhwb3J0IGNvbnN0IGdldEluc3BlY3Rpb25EZXRhaWxzID0gKG1vZGUsIHpvbmVzLCBpbnNwZWN0UG9pbnQsIHJlbmRlcmVkLCBjYW52YXMsIHhNaW4sIHRpbWVSYW5nZSwgcG9zaXRpb24pID0+IHtcbiAgbiArPSAxXG5cbiAgY29uc3QgWyB4QmFzZSwgeUJhc2UgXSA9IGluc3BlY3RQb2ludFxuXG4gIGNvbnN0IHggPSBjYW52YXMud2lkdGggKiAoeEJhc2UgLSB4TWluKSAvIHRpbWVSYW5nZVxuICBjb25zdCB5ID0gcG9zaXRpb24ucGFuWSAtIHlCYXNlIC8gcG9zaXRpb24uem9vbVlcblxuICBsZXQgZGF0YSA9IHtcbiAgICB6b25lOiAtMSxcbiAgICBwb2ludDogeyB4OiAtMSwgeTogLTEgfSxcbiAgICBpbmRleDogLTEsXG4gICAgcG9pbnRJbmRleDogLTFcbiAgfVxuXG4gIGlmKG1vZGUgIT0gJ2luc3BlY3QnKSByZXR1cm4gZGF0YVxuXG4gIGxldCBzZWxlY3RlZERpc3RhbmNlXG5cbiAgbGV0IHN0YW1wMSwgc3RhbXAyXG5cbiAgZm9yKGxldCBbIHByb3BlcnR5LCBsaW5lcyBdIG9mIE9iamVjdC5lbnRyaWVzKHJlbmRlcmVkKSkge1xuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xuXG4gICAgICAvLyBmaW5kIGNsb3Nlc3QgeCB2YWx1ZXMgb24gZWl0aGVyIHNpZGUgb2YgaW5zcGVjdGVkIHhcbiAgICAgIGlmKCFzdGFtcDEpIHtcbiAgICAgICAgbGV0IGxhc3RcbiAgICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICAgIGlmKHBvaW50LnRpbWUgPiB4QmFzZSAmJiBsYXN0KSB7XG4gICAgICAgICAgICBzdGFtcDEgPSBsYXN0LnhcbiAgICAgICAgICAgIHN0YW1wMiA9IHBvaW50LnhcbiAgICAgICAgICAgIGRhdGEucG9pbnRJbmRleCA9IGxpbmUuaW5kZXhPZihwb2ludClcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3QgPSB7IC4uLnBvaW50IH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCBwMSA9IGxpbmUuZmluZChwID0+IHAueCA9PSBzdGFtcDEpXG4gICAgICBjb25zdCBwMiA9IGxpbmUuZmluZChwID0+IHAueCA9PSBzdGFtcDIpXG5cbiAgICAgIGlmKHAxICYmIHAyKSB7XG4gICAgICAgIC8vIGNvbnN0IHRvdGFsWU9mZnNldCA9IE1hdGguYWJzKHkgLSBwMS55KSArIE1hdGguYWJzKHAyLnkgLSB5KVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZCA9IG1pbkRpc3RhbmNlKHAxLCBwMiwgeyB4LCB5IH0pXG4gICAgICAgIC8vIGxvZyhkKVxuICAgICAgICBpZihkIDwgc2VsZWN0ZWREaXN0YW5jZSB8fCBzZWxlY3RlZERpc3RhbmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBkYXRhLmluZGV4ID0gbGluZXMuaW5kZXhPZihsaW5lKVxuICAgICAgICAgIGRhdGEuem9uZSA9IHpvbmVzW2RhdGEuaW5kZXhdXG4gICAgICAgICAgZGF0YS5wb2ludCA9IGNsb3Nlc3QocDEsIHAyLCB7IHgsIHkgfSlcbiAgICAgICAgICBkYXRhLnByb3BlcnR5ID0gcHJvcGVydHlcbiAgICAgICAgICBzZWxlY3RlZERpc3RhbmNlID0gZFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGxvZyhzZWxlY3RlZFpvbmUpXG5cbiAgcmV0dXJuIGRhdGFcbn1cblxuY29uc3QgY2xvc2VzdCA9IChwMSwgcDIsIHRhcmdldCkgPT4ge1xuICBjb25zdCBkWDEgPSBNYXRoLmFicyhwMS54IC0gdGFyZ2V0LngpXG4gIGNvbnN0IGRYMiA9IE1hdGguYWJzKHAyLnggLSB0YXJnZXQueClcbiAgcmV0dXJuIGRYMSA+IGRYMiA/IHAyIDogcDFcbn1cblxuLy8gY2FsY3VsYXRlIGRpc3RhbmNlIG9mIGluc3BlY3Rpb24gcG9pbnQgZnJvbSBsaW5lIHNlZ21lbnRcbmNvbnN0IG1pbkRpc3RhbmNlID0gKGwxLCBsMiwgcCkgPT4ge1xuICByZXR1cm4gTWF0aC5taW4oTWF0aC5oeXBvdChsMS54IC0gcC54LCBsMS55IC0gcC55KSwgTWF0aC5oeXBvdChsMi54IC0gcC54LCBsMS55IC0gcC55KSlcbiAgLy8gY29uc3QgbiA9IE1hdGguYWJzKChsMi54IC0gbDEueCkgKiAobDEueSAtIHAueSkgLSAobDEueCAtIHAueCkgKiAobDIueSAtIGwxLnkpKVxuICAvLyBjb25zdCBkID0gTWF0aC5zcXJ0KE1hdGgucG93KGwyLnggLSBsMS54LCAyKSArIE1hdGgucG93KGwyLnkgLSBsMS55LCAyKSlcbiAgLy8gcmV0dXJuIG4gLyBkXG59IiwiaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IGRyYXdMaW5lcyB9IGZyb20gJy4vbGluZS11dGlscydcbmltcG9ydCB7IGdldEluc3BlY3Rpb25EZXRhaWxzIH0gZnJvbSAnLi9pbnNwZWN0aW9uJ1xuXG5cbi8qKlxuICogR2VuZXJhdGUgY2FudmFzIGZyYW1lIGJhc2VkIG9uIGN1cnJlbnQgYnVmZmVyL2NvbmZpZ1xuICogQHBhcmFtIHtPYmplY3R9IGNoYXJ0RGF0YSBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxvZ1N0YXRzIFxuICogQHBhcmFtIHtGdW5jdGlvbn0gc3VibWl0TGluZXMgXG4gKi9cbmNvbnN0IGRyYXcgPSAoY2hhcnREYXRhLCBsb2dTdGF0cywgc3VibWl0TGluZXMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zLCBwb3NpdGlvbiwgbW9kZSwgaW5zcGVjdGVkUG9pbnQgfSA9IGNoYXJ0RGF0YVxuXG4gIGxldCB7IHpvbmVzLCBqYW5rIH0gPSBjaGFydERhdGFcblxuICB6b25lcyA9IHpvbmVzLmZpbHRlcih4ID0+ICEheClcblxuICAvLyByZW5kZXIgbXVsdGlwbGUgY29waWVzIG9mIGVhY2ggbGluZSBmb3Igc3RyZXNzIHRlc3RpbmdcbiAgaWYoamFuaykge1xuICAgIHpvbmVzID0gem9uZXMuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcylcbiAgICB6b25lcyA9IHpvbmVzLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpXG4gIH1cblxuICBjb25zdCB7IHJhdGUgfSA9IGJ1ZmZlclBhcmFtc1xuXG4gIGNvbnN0IF9wcm9wcyA9IGNoYXJ0RGF0YS5wcm9wZXJ0aWVzXG4gIGNvbnN0IHByb3BlcnRpZXMgPSBfcHJvcHMuZmlsdGVyKHggPT4gISF4KVxuXG4gIGxldCBtYXhMaW5lUG9pbnRzID0gTWF0aC5taW4oNzAwLCBNYXRoLm1heCg4MCwgMjAwMDAgLyAoem9uZXMubGVuZ3RoICogcHJvcGVydGllcy5sZW5ndGgpKSkgKiAoY2hhcnREYXRhLnJlc29sdXRpb24gLyA0KVxuICBcbiAgY29uc3QgeyB4TWluLCB4TWF4LCBkWCwgeFNjYWxlLCB2YWxpZCwgeFJhbmdlIH0gPSBnZXRYUGFyYW1ldGVycyhwb3NpdGlvbiwgY2FudmFzLCBzY2FsZSwgcGF1c2VkKVxuICBpZighdmFsaWQpIHJldHVyblxuXG4gIGNvbnN0IHJlbmRlckxpbWl0ID0geE1pbiAtIDIwMDBcbiAgY29uc3Qgc2FtcGxlID0gYnVmZmVyLmFjdGl2ZS5maWx0ZXIoeCA9PiB4LnRpbWUgPj0gcmVuZGVyTGltaXQpXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgY29uc3QgcmVuZGVyZWQgPSBzYW1wbGUuZmlsdGVyKHggPT4ge1xuICAgIGNvbnN0IHZhbGlkVGltZSA9ICh4LnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlIG1pbk1TSW50ZXJ2YWwgPCAyMDAwIC8gcmF0ZVxuICAgIHJldHVybiB4ID09IHNhbXBsZVswXSB8fCB4ID09IHNhbXBsZVtzYW1wbGUubGVuZ3RoIC0gMV0gfHwgdmFsaWRUaW1lXG4gIH0pXG5cblxuICAvLyByZW5kZXJlZC5yZXZlcnNlKClcblxuICBsZXQgbGluZXMgPSB7fVxuICBsZXQgcmVuZGVyZWRMaW5lcyA9IHt9XG5cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXZnID0ge31cbiAgbGV0IGF1dG9TY2FsZSA9IHt9XG4gIGxldCB5VmFsdWVzID0ge31cbiAgbGV0IHRvdGFsUG9pbnRzID0gMFxuICBjb25zdCBvZmZzZXRZID0gcG9zaXRpb24ucGFuWVxuXG5cbiAgZm9yIChsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgbGluZXNbcHJvcF0gPSBbXVxuICAgIG1heFtwcm9wXSA9IDBcbiAgICBtaW5bcHJvcF0gPSA5OTk5OTk5OTk5OTk5OVxuICAgIHpvbmVzLmZvckVhY2goeCA9PiBsaW5lc1twcm9wXVt4IC0gMV0gPSBbXSlcblxuXG4gICAgLy8gY2FsY3VsYXRlIHggdmFsdWVzIGluIHBpeGVscywgZ2F0aGVyIHkgYXhpcyBkYXRhXG4gICAgZm9yIChsZXQgZnJhbWUgb2YgcmVuZGVyZWQpIHtcbiAgICAgIGNvbnN0IHggPSAoZnJhbWUudGltZSAtIHhNaW4pICogeFNjYWxlXG5cbiAgICAgIGZvciAobGV0IHogb2Ygem9uZXMpIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSwgdGltZTogZnJhbWUudGltZSB9KVxuICAgICAgICBtYXhbcHJvcF0gPSBNYXRoLm1heChtYXhbcHJvcF0sIHkpXG4gICAgICAgIG1pbltwcm9wXSA9IE1hdGgubWluKG1pbltwcm9wXSwgeSlcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueVtwcm9wXVxuICAgIGNvbnN0IHsgbWluWSwgbWF4WSB9ID0gZ2V0WVBhcmFtZXRlcnMocHJvcCwgbWluW3Byb3BdLCBtYXhbcHJvcF0sIHNjYWxlUGFyYW1zLCBwb3NpdGlvbilcblxuICAgIG1pbltwcm9wXSA9IG1pbllcbiAgICBtYXhbcHJvcF0gPSBtYXhZXG5cbiAgICAvLyBlc3RhYmxpc2ggcGl4ZWwgdG8gdW5pdCByYXRpb1xuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuXG5cbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSB5IHBpeGVsIHZhbHVlcyBiYXNlZCBvbiBlc3RhYmxpc2hlZCBzY2FsZVxuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lc1twcm9wXS5maWx0ZXIoeCA9PiAhIXgpKSB7XG4gICAgICBsZXQgcmVuZGVyZWRMaW5lID0gW11cbiAgICAgIFxuICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgIHBvaW50LnkgPSBvZmZzZXRZICsgcGFyc2VJbnQoY2FudmFzLmhlaWdodCAtIChwb2ludC55IC0gbWluW3Byb3BdKSAqIGF1dG9TY2FsZVtwcm9wXSlcbiAgICAgICAgcmVuZGVyZWRMaW5lLnB1c2gocG9pbnQpXG4gICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXS5wdXNoKHJlbmRlcmVkTGluZSlcbiAgICB9XG5cbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuXG4gICAgaWYoeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyA9PSAwKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cblxuICBsZXQgaW5zcGVjdGlvbkRldGFpbHMgPSBnZXRJbnNwZWN0aW9uRGV0YWlscyhtb2RlLCB6b25lcywgaW5zcGVjdGVkUG9pbnQsIHJlbmRlcmVkTGluZXMsIGNhbnZhcywgeFJhbmdlLCB4TWluLCBwb3NpdGlvbilcbiAgaW5zcGVjdGlvbkRldGFpbHMuZnJhbWUgPSBnZXRGcmFtZShyZW5kZXJlZCwgaW5zcGVjdGlvbkRldGFpbHMucG9pbnRJbmRleCwgaW5zcGVjdGlvbkRldGFpbHMuem9uZSlcblxuICBjb25zdCBzZWxlY3RlZCA9IFsgaW5zcGVjdGlvbkRldGFpbHMuaW5kZXggXVxuXG4gIGlmKGNhbnZhcyAmJiBjdHgpIHtcbiAgICBkcmF3TGluZXMoX3Byb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQgfSlcbiAgfSBlbHNlIHtcbiAgICBzdWJtaXRMaW5lcyh7IHJlbmRlcmVkTGluZXMsIHNlbGVjdGVkIH0pXG4gIH1cblxuICBjb25zdCBwbG90RmlsbGVkID0gc2FtcGxlLmxlbmd0aCA8IGJ1ZmZlci5hY3RpdmUubGVuZ3RoXG5cbiAgbG9nU3RhdHMoeyB0b3RhbFBvaW50cywgbWF4LCBtaW4sIGF2ZywgcGxvdEZpbGxlZCwgaW5zcGVjdGlvbkRldGFpbHMsIHhNYXgsIHhNaW4gfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhd1xuXG5cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cbmNvbnN0IGdldEZyYW1lID0gKHJlbmRlcmVkLCBpZHgsIHpvbmUpID0+IHtcbiAgLy8gY29uc29sZS5sb2coaWR4LCB6b25lLCByZW5kZXJlZC5sZW5ndGgpXG4gIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaWR4XVxuICAvLyBjb25zb2xlLmxvZyhmcmFtZSlcbiAgaWYoIWZyYW1lKSByZXR1cm4ge31cbiAgcmV0dXJuIGZyYW1lLmRhdGFbem9uZSAtIDFdXG59XG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCkgPT4ge1xuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cbiAgaWYgKCFsYXRlc3QpIHJldHVybiB7IHZhbGlkOiBmYWxzZSB9XG5cbiAgY29uc3QgeFpvb21GYWN0b3IgPSBwb3NpdGlvbi56b29tWFxuICAvLyBsZXQgc1JhbmdlID0gc2NhbGUgJiYgc2NhbGUueCA/IHBhcnNlSW50KHNjYWxlLngpIDogMTBcbiAgbGV0IHNSYW5nZSA9IHBhcnNlSW50KHNjYWxlLngpXG5cbiAgY29uc3QgeFJhbmdlID0gc1JhbmdlICogMTAwMFxuXG4gIGxldCBwYW5YUmF0aW8gPSBwb3NpdGlvbi5wYW5YIC8gY2FudmFzLndpZHRoXG4gIGxldCB0aW1lT2Zmc2V0ID0geFJhbmdlICogcGFuWFJhdGlvXG5cbiAgY29uc3QgZGVsYXkgPSBNYXRoLm1heCgxMDAwLCAuMDEgKiB4UmFuZ2UpXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheSAtIHRpbWVPZmZzZXRcbiAgbGV0IHJhd1hNYXggPSBwYXVzZWQgPyBsYXRlc3QudGltZSAtIGRlbGF5ICogLjI1IC0gdGltZU9mZnNldCA6IG5vd1xuICBsZXQgcmF3WE1pbiA9IHJhd1hNYXggLSB4UmFuZ2VcblxuICBsZXQgbWlkID0gcmF3WE1pbiArIHhSYW5nZSAvIDJcbiAgY29uc3Qgc2NhbGVkID0geFJhbmdlICogeFpvb21GYWN0b3IgLyAyXG5cbiAgY29uc3QgeE1heCA9IG1pZCArIHNjYWxlZFxuICBjb25zdCB4TWluID0gbWlkIC0gc2NhbGVkXG5cbiAgY29uc3QgZFggPSB4TWF4IC0geE1pblxuICBjb25zdCB4U2NhbGUgPSBjYW52YXMud2lkdGggLyAoeE1heCAtIHhNaW4pXG5cbiAgcmV0dXJuIHsgeE1pbiwgeE1heCwgeFJhbmdlLCBkWCwgeFNjYWxlLCB2YWxpZDogdHJ1ZSB9XG59XG5cblxuXG4vLyBnZXQgdGhlIHkgYXhpcyBib3VuZHNcbmNvbnN0IGdldFlQYXJhbWV0ZXJzID0gKHByb3AsIG1pbiwgbWF4LCBzY2FsZVBhcmFtcywgcG9zaXRpb24pID0+IHtcbiAgLy8gY29uc29sZS5sb2cobWluLCBtYXgpXG4gIGlmICghbmVnYXRpdmVzLmluY2x1ZGVzKHByb3ApKSB7XG4gICAgbWluID0gTWF0aC5tYXgobWluLCAwKVxuICB9XG5cbiAgY29uc3QgbWluQXV0byA9IHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bydcbiAgY29uc3QgbWF4QXV0byA9IHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bydcblxuXG4gIGlmICghbWluQXV0bykgbWluID0gc2NhbGVQYXJhbXMubWluICogMTBcbiAgaWYgKCFtYXhBdXRvKSBtYXggPSBzY2FsZVBhcmFtcy5tYXggKiAxMFxuXG4gIGNvbnN0IHIgPSBtYXggLSBtaW5cblxuICBpZiAoc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5taW4gIT0gJ2F1dG8nKSB7XG4gICAgbWF4ICs9IHIgLyAxMFxuICB9XG4gIGlmIChzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nICYmIHNjYWxlUGFyYW1zLm1heCAhPSAnYXV0bycpIHtcbiAgICBtaW4gLT0gciAvIDEwXG4gIH1cblxuICBjb25zdCBzY2FsZUZhY3RvciA9IHBvc2l0aW9uLnpvb21ZXG5cbiAgY29uc3QgaGFsZlJhbmdlID0gKG1heCAtIG1pbikgLyAyXG4gIGNvbnN0IG1pZFBvaW50ID0gbWluICsgaGFsZlJhbmdlXG4gIG1pbiA9IG1pZFBvaW50IC0gaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcbiAgbWF4ID0gbWlkUG9pbnQgKyBoYWxmUmFuZ2UgKiBzY2FsZUZhY3RvclxuXG4gIGNvbnN0IHNjYWxlZE1pbiA9IG1pblxuICBjb25zdCBzY2FsZWRNYXggPSBtYXhcblxuICAvLyBlbnN1cmUgcm91bmQgbnVtYmVycyBhcmUgdXNlZCBmb3IgdGhlIHNjYWxlXG4gIGNvbnN0IGV2ZW4gPSBpID0+IHtcbiAgICBpZiAobWluQXV0bykgbWluID0gLWkgKyBpICogTWF0aC5jZWlsKG1pbiAvIGkpXG4gICAgaWYgKG1heEF1dG8pIG1heCA9IGkgKyBpICogTWF0aC5mbG9vcihtYXggLyBpKVxuICB9XG5cblxuXG4gIGxldCBtYXRjaGVkID0gZmFsc2VcbiAgZm9yIChsZXQgeCBvZiBbIDEwLCAxMDAsIDIwMCwgNTAwLCAxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMCBdKSB7XG4gICAgaWYgKG1hdGNoZWQpIGJyZWFrXG4gICAgZm9yIChsZXQgeSBvZiBbIDEsIDIsIDQsIDggXSkge1xuICAgICAgY29uc3QgYmFzZSA9IHggKiB5XG4gICAgICBpZiAociA8IGJhc2UpIHtcbiAgICAgICAgZXZlbihiYXNlIC8gNSlcbiAgICAgICAgbWF0Y2hlZCA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoIW1hdGNoZWQpIGV2ZW4oMjAwMDApXG5cbiAgY29uc3QgbWF4T2Zmc2V0ID0gc2NhbGVkTWF4IC0gbWF4IC8gKG1heCAtIG1pbilcbiAgY29uc3QgbWluT2Zmc2V0ID0gc2NhbGVkTWluIC0gbWluIC8gKG1heCAtIG1pbilcblxuICByZXR1cm4geyBtaW5ZOiBtaW4sIG1heFk6IG1heCwgbWF4T2Zmc2V0LCBtaW5PZmZzZXQgfVxufSIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpIFxuICAgIH0gZWxzZSB7XG4gICAgICBwb3N0TWVzc2FnZVxuICAgIH1cbiAgfVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5sZXQgcmVxdWVzdEFuaW1GcmFtZVxudHJ5IHtcbiAgcmVxdWVzdEFuaW1GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZVxufSBjYXRjaChlKSB7XG4gIHRyeSB7XG4gICAgcmVxdWVzdEFuaW1GcmFtZSA9IHdlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB9IGNhdGNoKGUpIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IG1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbiAqLyBjYWxsYmFjaywgLyogRE9NRWxlbWVudCAqLyBlbGVtZW50KSB7XG4gICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG5sZXQgcmVmcmVzaFJhdGUgPSA2MFxuXG4vLyBnZXQgcmVmcmVzaCByYXRlIGZvciBjdXJyZW50IGRpc3BsYXlcbmNvbnN0IGdldFJlZnJlc2hSYXRlID0gYXN5bmMgKGZyYW1lcyA9IDYwKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGxhc3RcbiAgICBjb25zdCB0aW1lcyA9IFtdXG4gICAgY29uc3QgZ2V0VGltZSA9IG4gPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgIGlmKGxhc3QpIHRpbWVzLnB1c2gobm93IC0gbGFzdClcbiAgICAgIGxhc3QgPSBub3dcblxuICAgICAgaWYobiA9PSAwKSB7XG4gICAgICAgIGNvbnN0IHRvdGFsID0gdGltZXMucmVkdWNlKCh0b3RhbCwgdCkgPT4gdG90YWwgKyB0LCAwKVxuICAgICAgICBjb25zdCBhdmcgPSB0b3RhbCAvIHRpbWVzLmxlbmd0aFxuICAgICAgICByZXNvbHZlKDEwMDAgLyBhdmcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0QW5pbUZyYW1lKCgpID0+IGdldFRpbWUobiAtIDEpKVxuICAgICAgfVxuICAgIH1cbiAgICBnZXRUaW1lKGZyYW1lcylcbiAgfSlcbn1cblxuZ2V0UmVmcmVzaFJhdGUoMTAwMCkudGhlbihyYXRlID0+IHtcbiAgaWYocmF0ZSA8IDQwKSB7XG4gICAgcmVmcmVzaFJhdGUgPSAzMFxuICB9XG4gIC8vIGNvbnNvbGUubG9nKHJlZnJlc2hSYXRlKVxufSlcblxuXG5jb25zdCByZW5kZXJlcnMgPSB7XG4gICdsaW5lJzogcmVuZGVyTGluZVxufVxuXG5sZXQgY2hhcnREYXRhID0ge1xuICBjYW52YXM6IG51bGwsXG4gIGN0eDogbnVsbCxcbiAgdHlwZTogJycsXG4gIHByb3BlcnRpZXM6IFtdLFxuICBzY2FsZToge1xuICAgIHg6IDEwLFxuICAgIHk6ICdhdXRvJ1xuICB9LFxuICBidWZmZXJQYXJhbXM6IHtcbiAgICByYXRlOiAxMFxuICB9LFxuICAvLyBjdXJyZW50IGRhdGFwb2ludCBkZW5zaXR5IHNldHRpbmcgKDEgLSA0KVxuICByZXNvbHV0aW9uOiA0XG59XG5cbmxldCBwb3J0XG5cblxubGV0IHN0YXRzID0ge31cbmNvbnN0IGxvZ1N0YXRzID0gcyA9PiBzdGF0cyA9IHsgLi4uc3RhdHMsIC4uLnMgfVxuXG4vLyBtb3N0IHJlY2VudCBzZXQgb2YgcmVuZGVyIHRpbWVzICh0byBkZXRlcm1pbmUgZnJhbWUgcmF0ZSlcbmxldCByZW5kZXJUaW1lcyA9IFtdXG5cbi8vIGZyYW1lcmF0ZSBzbmFwc2hvdHMgdG8gbW9uaXRvciBzeXN0ZW0gc3RyYWluXG5sZXQgcGVyZm9ybWFuY2VIaXN0b3J5ID0gW11cblxuLy8gdHJhY2sgbW9zdCByZWNlbnQgXG5sZXQgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4vLyB0cmFjayBudW1iZXIgb2YgdGltZXMgbWF4IFJlc29sdXRpb24gcmVjb21tZW5kZWRcbmxldCBtYXhSZXNDb3VudCA9IDBcblxuXG5cbmxldCBsYXN0ID0gMFxuY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gIGlmIChyZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKSB7XG4gICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc2NhbGUnLCB2YWx1ZTogeyB4TWF4OiBzdGF0cy54TWF4LCB4TWluOiBzdGF0cy54TWluLCBvZmZzZXRzOiBzdGF0cy5vZmZzZXRzLCBpbnNwZWN0aW9uOiBzdGF0cy5pbnNwZWN0aW9uRGV0YWlscyB9fSlcbiAgICByZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKVxuICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICB9XG4gIGxhc3QgPSB0XG4gIHJlcXVlc3RBbmltRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1GcmFtZShkcmF3KVxuXG5jb25zdCBzdWJtaXRMaW5lcyA9IGxpbmVzID0+IHtcbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnbGluZXMnLCBsaW5lcyB9KVxufVxuXG5jb25zdCBjb2xsZWN0U3RhdHMgPSAoKSA9PiB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG5cbiAgY29uc3QgdG90YWxSZW5kZXIgPSByZW5kZXJUaW1lcy5yZWR1Y2UoKHQsIHRvdGFsKSA9PiB0b3RhbCArIHQsIDApXG4gIGNvbnN0IGF2Z1JlbmRlciA9IHRvdGFsUmVuZGVyIC8gcmVuZGVyVGltZXMubGVuZ3RoXG4gIGNvbnN0IGZyYW1lcmF0ZSA9IE1hdGguY2VpbCgxMDAwIC8gYXZnUmVuZGVyKVxuICBwZXJmb3JtYW5jZUhpc3RvcnkucHVzaChmcmFtZXJhdGUpXG5cbiAgLy8ga2VlcCBsYXN0IDEwcyBvZiBmcmFtZXJhdGUgZGF0YSBmb3IgcGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xuICBwZXJmb3JtYW5jZUhpc3RvcnkgPSBwZXJmb3JtYW5jZUhpc3Rvcnkuc2xpY2UoLTMwKVxuXG4gIC8vIHRydW5jYXRlIGZyYW1lIGRhdGEgdG8ga2VlcCBhIHJvbGxpbmcgYXZlcmFnZVxuICByZW5kZXJUaW1lcyA9IHJlbmRlclRpbWVzLnNsaWNlKC02MClcblxuICAvLyBpZiBlbm91Z2ggdGltZSBoYXMgcGFzc2VkLCBjYWxjdWxhdGUgcmVjb21tZW5kZWQgcmVzb2x1dGlvblxuICBpZihub3cgLSBsYXN0UmVzb2x1dGlvbkNoYW5nZSA+IDEwMDApIHtcbiAgICBsYXN0UmVzb2x1dGlvbkNoYW5nZSA9IG5vd1xuXG4gICAgY29uc3QgcmVjb21tZW5kZWQgPSBNYXRoLmNlaWwoKGZyYW1lcmF0ZSAtIDE1KSAqIDQgLyAocmVmcmVzaFJhdGUgLSAxNSkpXG5cbiAgICBpZihyZWNvbW1lbmRlZCA+IDMgJiYgY2hhcnREYXRhLnJlc29sdXRpb24gPT0gMykge1xuICAgICAgaWYobWF4UmVzQ291bnQgPiAzKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gNFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF4UmVzQ291bnQgKz0gMVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYXhSZXNDb3VudCA9IDBcblxuICAgICAgLy8gZW5zdXJlIHdlJ3JlIGFpbWluZyBmb3IgcmVjb21tZW5kZWQgKy8tIDFcbiAgICAgIGlmIChyZWNvbW1lbmRlZCAtIDEgPiBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiArPSAxXG4gICAgICB9IGVsc2UgaWYgKHJlY29tbWVuZGVkICsgMSA8IGNoYXJ0RGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC09IDFcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjbGFtcCBhdCAxIC0gNFxuICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oY2hhcnREYXRhLnJlc29sdXRpb24sIDQpKVxuXG4gICAgc3RhdHMucmVzb2x1dGlvbiA9IGNoYXJ0RGF0YS5yZXNvbHV0aW9uXG4gIH1cblxuICBzdGF0cyA9IHsgLi4uc3RhdHMsIGZyYW1lcmF0ZSB9XG4gIGNoYXJ0RGF0YS5mcmFtZXJhdGUgPSBmcmFtZXJhdGVcblxuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGF0cycsIHZhbHVlOiBzdGF0cyB9KVxufVxuXG5zZXRJbnRlcnZhbChjb2xsZWN0U3RhdHMsIDEwMDAgLyAzKVxuXG5cblxuXG5jb25zdCBpbml0aWFsaXplID0gYXN5bmMgKCkgPT4ge1xuICBwb3J0Lm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuICAgIGlmKGRhdGEgPT0gJ3Jlc2V0Jykge1xuICAgICAgYnVmZmVyLnJlc2V0KClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGNoYXJ0RGF0YS5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgaWYgKGRhdGEudXBkYXRlICYmIGRhdGEudXBkYXRlLmxlbmd0aCA9PSBtYXhDaHVua1NpemUpIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSBmYWxzZVxuICAgICAgfVxuICAgICAgYnVmZmVyLndyaXRlKGRhdGEudXBkYXRlKVxuICAgIH1cbiAgfVxuXG4gIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAncmVhZEJ1ZmZlcicgfSlcbn1cblxuXG5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgaWYgKGUuZGF0YS53c1BvcnQpIHtcbiAgICBwb3J0ID0gZS5kYXRhLndzUG9ydFxuICAgIGluaXRpYWxpemUoKVxuICB9IGVsc2UgaWYgKGUuZGF0YSA9PSAnY2xvc2UnKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjbG9zZScgfSlcbiAgfSBlbHNlIHtcbiAgICBjaGFydERhdGEgPSB7IC4uLmNoYXJ0RGF0YSwgLi4uZS5kYXRhIH1cbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgZGF0YScsIGNoYXJ0RGF0YSlcbiAgICBpZiAoY2hhcnREYXRhLnBhdXNlZCkge1xuICAgICAgYnVmZmVyLnBhdXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyLnBsYXkoKVxuICAgIH1cbiAgICBpZiAoZS5kYXRhLmNhbnZhcyAmJiBlLmRhdGEuY2FudmFzLmdldENvbnRleHQpIHtcbiAgICAgIGNoYXJ0RGF0YS5jdHggPSBjaGFydERhdGEuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJidWZmZXIiLCJkcmF3IiwicmVuZGVyTGluZSJdLCJtYXBwaW5ncyI6Ijs7O0VBQUEsSUFBSUEsUUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7QUFDQUEsVUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksRUFBRTtFQUM5QjtF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QUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBQztBQUNsRDtFQUNBLEVBQUUsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7RUFDMUIsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUM1QixNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNELFFBQVEsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztFQUMzQyxRQUFRLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDbEUsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0VBQ0g7O0VDckdPLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxLQUFLO0FBRWhIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLGFBQVk7QUFDdkM7RUFDQSxFQUFFLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLFVBQVM7RUFDckQsRUFBRSxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUMsTUFBSztBQUNsRDtFQUNBLEVBQUUsSUFBSSxJQUFJLEdBQUc7RUFDYixJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7RUFDWixJQUFJLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7RUFDM0IsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0VBQ2IsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0VBQ2xCLElBQUc7QUFDSDtFQUNBLEVBQUUsR0FBRyxJQUFJLElBQUksU0FBUyxFQUFFLE9BQU8sSUFBSTtBQUNuQztFQUNBLEVBQUUsSUFBSSxpQkFBZ0I7QUFDdEI7RUFDQSxFQUFFLElBQUksTUFBTSxFQUFFLE9BQU07QUFDcEI7RUFDQSxFQUFFLElBQUksSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0VBQzNELElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7QUFDM0I7RUFDQTtFQUNBLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRTtFQUNsQixRQUFRLElBQUksS0FBSTtFQUNoQixRQUFRLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO0VBQ2hDLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLEVBQUU7RUFDekMsWUFBWSxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUM7RUFDM0IsWUFBWSxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUM7RUFDNUIsWUFBWSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDO0VBQ2pELFlBQVksS0FBSztFQUNqQixXQUFXO0VBQ1gsVUFBVSxJQUFJLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRTtFQUM3QixTQUFTO0VBQ1QsT0FBTztFQUNQO0VBQ0EsTUFBTSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sRUFBQztFQUM5QyxNQUFNLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxFQUFDO0FBQzlDO0VBQ0EsTUFBTSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7RUFDbkI7RUFDQTtFQUNBLFFBQVEsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUM7RUFDL0M7RUFDQSxRQUFRLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtFQUNuRSxVQUFVLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUM7RUFDMUMsVUFBVSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0VBQ3ZDLFVBQVUsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQztFQUNoRCxVQUFVLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUTtFQUNsQyxVQUFVLGdCQUFnQixHQUFHLEVBQUM7RUFDOUIsU0FBUztFQUNULE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztFQUNIO0FBQ0E7RUFDQSxFQUFFLE9BQU8sSUFBSTtFQUNiLEVBQUM7QUFDRDtFQUNBLE1BQU0sT0FBTyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLEtBQUs7RUFDcEMsRUFBRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUN2QyxFQUFFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFDO0VBQ3ZDLEVBQUUsT0FBTyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzVCLEVBQUM7QUFDRDtFQUNBO0VBQ0EsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSztFQUNuQyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN6RjtFQUNBO0VBQ0E7RUFDQTs7RUN0RUE7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTUMsTUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEtBQUs7RUFDbkQsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxHQUFHLFVBQVM7QUFDaEc7RUFDQSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBUztBQUNqQztFQUNBLEVBQUUsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDaEM7RUFDQTtFQUNBLEVBQUUsR0FBRyxJQUFJLEVBQUU7RUFDWCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQzNELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDM0QsR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsYUFBWTtBQUMvQjtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVU7RUFDckMsRUFBRSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsRUFBRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0VBQzFIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDO0VBQ25HLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNO0FBQ25CO0VBQ0EsRUFBRSxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsS0FBSTtFQUNqQyxFQUFFLE1BQU0sTUFBTSxHQUFHRCxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxXQUFXLEVBQUM7QUFDakU7RUFDQTtFQUNBLEVBQUUsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLGNBQWE7QUFDMUM7RUFDQSxFQUFFLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJO0VBQ3RDLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLGFBQWEsSUFBSSxhQUFhLEdBQUcsSUFBSSxHQUFHLEtBQUk7RUFDNUUsSUFBSSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLFNBQVM7RUFDeEUsR0FBRyxFQUFDO0FBQ0o7QUFDQTtFQUNBO0FBQ0E7RUFDQSxFQUFFLElBQUksS0FBSyxHQUFHLEdBQUU7RUFDaEIsRUFBRSxJQUFJLGFBQWEsR0FBRyxHQUFFO0FBQ3hCO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQ2QsRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQ2QsRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQ2QsRUFBRSxJQUFJLFNBQVMsR0FBRyxHQUFFO0VBQ3BCLEVBQUUsSUFBSSxPQUFPLEdBQUcsR0FBRTtFQUNsQixFQUFFLElBQUksV0FBVyxHQUFHLEVBQUM7RUFDckIsRUFBRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsS0FBSTtBQUMvQjtBQUNBO0VBQ0EsRUFBRSxLQUFLLElBQUksSUFBSSxJQUFJLFVBQVUsRUFBRTtFQUMvQixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFFO0VBQ3BCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDakIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBYztFQUM5QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFDO0FBQy9DO0FBQ0E7RUFDQTtFQUNBLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxRQUFRLEVBQUU7RUFDaEMsTUFBTSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLE9BQU07QUFDNUM7RUFDQSxNQUFNLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFO0VBQzNCLFFBQVEsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0FBQ3ZDO0VBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFDO0VBQzNCLFFBQVEsSUFBSSxJQUFJLElBQUksV0FBVyxFQUFFO0VBQ2pDLFVBQTJCLFdBQVcsQ0FBQyxLQUFLLEVBQUM7RUFDN0MsVUFFaUI7RUFDakIsWUFBWSxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsWUFBVztFQUNqRCxXQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUM7RUFDM0QsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQzFDLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQztFQUMxQyxPQUFPO0VBQ1AsS0FBSztBQUNMO0FBQ0E7RUFDQSxJQUFJLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ3JDLElBQUksTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBQztBQUM1RjtFQUNBLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUk7RUFDcEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSTtBQUNwQjtFQUNBO0VBQ0EsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDO0FBQzdEO0FBQ0E7RUFDQSxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFFO0VBQzVCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHO0VBQ3BCLE1BQU0sS0FBSyxFQUFFLENBQUM7RUFDZCxNQUFNLFdBQVcsRUFBRSxDQUFDO0VBQ3BCLE1BQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNsRCxNQUFNLElBQUksWUFBWSxHQUFHLEdBQUU7RUFDM0I7RUFDQSxNQUFNLEtBQUssSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO0VBQzlCLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsRUFBQztFQUN0QyxRQUFRLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksRUFBQztFQUN0QyxRQUFRLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDO0VBQzdGLFFBQVEsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDaEMsUUFBUSxXQUFXLEdBQUU7RUFDckIsT0FBTztFQUNQO0VBQ0EsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBQztFQUM1QyxLQUFLO0FBQ0w7RUFDQSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFXO0FBQy9EO0VBQ0EsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyxFQUFFO0VBQ3ZDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDbkIsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNuQixLQUFLO0VBQ0wsR0FBRztBQUNIO0FBQ0E7RUFDQSxFQUFFLElBQUksaUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBQztFQUMxSCxFQUFFLGlCQUFpQixDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUM7QUFDcEc7RUFDQSxFQUFFLE1BQU0sUUFBUSxHQUFHLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxHQUFFO0FBQzlDO0VBQ0EsRUFBRSxHQUFHLE1BQU0sSUFBSSxHQUFHLEVBQUU7RUFDcEIsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsRUFBQztFQUMxRCxHQUFHLE1BQU07RUFDVCxJQUFJLFdBQVcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsRUFBQztFQUM1QyxHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUdBLFFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTTtBQUN6RDtFQUNBLEVBQUUsUUFBUSxDQUFDLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUM7RUFDckYsRUFBQztBQUdEO0FBQ0E7QUFDQTtFQUNBO0VBQ0EsTUFBTSxTQUFTLEdBQUcsRUFBRSxXQUFXLEdBQUU7QUFDakM7RUFDQSxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFDO0FBQy9DO0VBQ0EsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEtBQUs7RUFDOUIsRUFBRSxJQUFJLFFBQVEsR0FBRztFQUNqQixJQUFJLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDcEMsSUFBSSxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQ3BDLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUNoQyxJQUFJLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDbEMsSUFBSSxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQ3JDLElBQUksS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUNuQyxJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDckMsSUFBSSxhQUFhLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQzNDLElBQUc7RUFDSCxFQUFFLE9BQU8sUUFBUTtFQUNqQixFQUFDO0FBQ0Q7RUFDQSxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxLQUFLO0VBQzFDO0VBQ0EsRUFBRSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFDO0VBQzdCO0VBQ0EsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTtFQUN0QixFQUFFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0VBQzdCLEVBQUM7QUFDRDtFQUNBO0VBQ0EsTUFBTSxjQUFjLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEtBQUs7RUFDNUQsRUFBRSxNQUFNLE1BQU0sR0FBR0EsUUFBTSxDQUFDLE1BQU0sQ0FBQ0EsUUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFDO0VBQ3hELEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtBQUN0QztFQUNBLEVBQUUsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE1BQUs7RUFDcEM7RUFDQSxFQUFFLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO0FBQ2hDO0VBQ0EsRUFBRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSTtBQUM5QjtFQUNBLEVBQUUsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBSztFQUM5QyxFQUFFLElBQUksVUFBVSxHQUFHLE1BQU0sR0FBRyxVQUFTO0FBQ3JDO0VBQ0EsRUFBRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLEdBQUcsTUFBTSxFQUFDO0FBQzVDO0VBQ0EsRUFBRSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssR0FBRyxXQUFVO0VBQ3ZELEVBQUUsSUFBSSxPQUFPLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxVQUFVLEdBQUcsSUFBRztFQUNyRSxFQUFFLElBQUksT0FBTyxHQUFHLE9BQU8sR0FBRyxPQUFNO0FBQ2hDO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxPQUFPLEdBQUcsTUFBTSxHQUFHLEVBQUM7RUFDaEMsRUFBRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsV0FBVyxHQUFHLEVBQUM7QUFDekM7RUFDQSxFQUFFLE1BQU0sSUFBSSxHQUFHLEdBQUcsR0FBRyxPQUFNO0VBQzNCLEVBQUUsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLE9BQU07QUFDM0I7RUFDQSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxLQUFJO0VBQ3hCLEVBQUUsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxFQUFDO0FBQzdDO0VBQ0EsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO0VBQ3hELEVBQUM7QUFDRDtBQUNBO0FBQ0E7RUFDQTtFQUNBLE1BQU0sY0FBYyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLFFBQVEsS0FBSztFQUNsRTtFQUNBLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDakMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQzFCLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxPQUFNO0VBQzNDLEVBQUUsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxPQUFNO0FBQzNDO0FBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsR0FBRTtFQUMxQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUcsR0FBRTtBQUMxQztFQUNBLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUc7QUFDckI7RUFDQSxFQUFFLElBQUksV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLElBQUksV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLEVBQUU7RUFDOUQsSUFBSSxHQUFHLElBQUks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
