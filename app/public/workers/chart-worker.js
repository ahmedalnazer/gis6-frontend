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

  const getInspectionDetails = (mode, zones, inspectPoint, rendered) => {

    const [ time, y ] = inspectPoint;

    let data = {
      zone: -1,
      point: { x: -1, y: -1 },
      index: -1,
      pointIndex: -1
    };

    if(mode != 'inspect') return data

    let selectedDistance;

    let stamps = [];

    for(let [ property, lines ] of Object.entries(rendered)) {
      for(let line of lines) {

        // find closest x values on either side of inspected x
        if(!stamps[0]) {
          let minGap = 99999999999;
          let closest;
          for(let point of line) {
            const xOffset = Math.abs(point.time - time);
            if(xOffset < minGap) {
              closest = point;
              minGap = xOffset;
            } else {
              break
            }
          }
          const idx = line.indexOf(closest);
          for(let o of [ 1, 2, 3, 4 ]) {
            if(idx - o >= 0) {
              stamps.push(line[idx - o].x);
            }
            if(idx + o <= line.length - 1) {
              stamps.push(line[idx + o].x);
            }
          }
          // stamps.sort()
        }

        // find points for this line with x values matching the set determined above
        const points = stamps.map(stamp => line.find(p => p.x == stamp)).filter(x => !!x);

        if(points[0]) {
          // get min distance from points/segments and closest point
          const { distance, closest } = minDistance(points, { time, y });

          if(distance < selectedDistance || selectedDistance === undefined) {
            data.index = lines.indexOf(line);
            data.zone = zones[data.index];
            data.point = closest;
            data.pointIndex = line.indexOf(closest);
            data.property = property;
            selectedDistance = distance;
          }
        }
      }
    }

    return data
  };


  // simple distance calculation between two points
  const getDistance = (p1, p2) => {
    const a = p1.time - p2.time;
    const b = p1.y - p2.y;
    return Math.sqrt(a * a + b * b)
  };


  // get shortest distance between a line segment and a point
  function getSegmentDistance(l1, l2, p) {
    const x = p.time;
    const y = p.y;
    const x1 = l1.time;
    const y1 = l1.y;
    const x2 = l2.time;
    const y2 = l2.y;

    var A = x - x1;
    var B = y - y1;
    var C = x2 - x1;
    var D = y2 - y1;

    var dot = A * C + B * D;
    var len_sq = C * C + D * D;
    var param = -1;
    if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

    var xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    }
    else if (param > 1) {
      xx = x2;
      yy = y2;
    }
    else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    var dx = x - xx;
    var dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy)
  }

  // calculate distance of inspection point from points and/or line segments
  const minDistance = (points, target) => {
    let closest;
    let pointDistance = null;
    let lineDistance = 999999999;
    for(let i = 0; i < points.length; i++) {
      const point = points[i];
      const d = getDistance(point, target);
      if(pointDistance === null || d < pointDistance) {
        closest = point;
        pointDistance = d;
      }
      if(i > 0) {
        lineDistance = Math.min(lineDistance, getSegmentDistance(points[i], points[i - 1], target));
      }
    }
    return { closest, distance: Math.min(lineDistance, pointDistance) }
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
          lines[prop][z - 1].push({ x, y, time: frame.ts });
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


    let inspectionDetails = getInspectionDetails(mode, zones, inspectedPoint, renderedLines);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvaW5zcGVjdGlvbi5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2xpbmUtcGxvdC5qcyIsIi4uLy4uL3NyYy9kYXRhL3JlYWx0aW1lL2J1ZmZlci5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2NoYXJ0LXdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYnVmZmVyID0ge1xuICBlbnRyaWVzOiBbXSxcbiAgYWN0aXZlOiBbXSxcbiAgcGF1c2VkOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZycsIGRhdGEpXG4gIGJ1ZmZlci5lbnRyaWVzID0gWyAuLi5idWZmZXIuZW50cmllcywgLi4uZGF0YSBdLmZpbHRlcih4ID0+ICEheCkuc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgMTogJyNBMTAzRkYnLFxuICAyOiAnI0ZGOUMwMycsXG4gIDM6ICcjMDNDRkZGJyxcbiAgNDogJyMyRTAzRkYnXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNtb290aChjdHgsIHBvaW50cywgY29sb3IsIHdpZHRoKSB7XG4gIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yXG4gIGN0eC5saW5lV2lkdGggPSB3aWR0aFxuICAvLyBjdHguc3Ryb2tlUmVjdCgyMCwgMjAsIDE1MCwgMTAwKVxuXG4gIGN0eC5iZWdpblBhdGgoKVxuICBpZiAocG9pbnRzID09IHVuZGVmaW5lZCB8fCBwb2ludHMubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDEpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDIpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1sxXS54LCBwb2ludHNbMV0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYocG9pbnRzLmxlbmd0aCA8IDMpIHJldHVyblxuICAvLyBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gIC8vICAgLy8gY3R4LmxpbmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnkpXG4gIC8vICAgdmFyIHhjID0gKHBvaW50c1tpXS54ICsgcG9pbnRzW2kgKyAxXS54KSAvIDJcbiAgLy8gICB2YXIgeWMgPSAocG9pbnRzW2ldLnkgKyBwb2ludHNbaSArIDFdLnkpIC8gMlxuICAvLyAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAvLyAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgeGMsIHljKVxuICAvLyB9XG4gIC8vIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgcG9pbnRzW2kgKyAxXS54LCBwb2ludHNbaSArIDFdLnkpXG5cbiAgZnVuY3Rpb24gZ3JhZGllbnQoYSwgYikge1xuICAgIHJldHVybiAoYi55IC0gYS55KSAvIChiLnggLSBhLngpXG4gIH1cblxuICBmdW5jdGlvbiBiekN1cnZlKHBvaW50cywgZiwgdCkge1xuICAgIC8vZiA9IDAsIHdpbGwgYmUgc3RyYWlnaHQgbGluZVxuICAgIC8vdCBzdXBwb3NlIHRvIGJlIDEsIGJ1dCBjaGFuZ2luZyB0aGUgdmFsdWUgY2FuIGNvbnRyb2wgdGhlIHNtb290aG5lc3MgdG9vXG4gICAgaWYgKHR5cGVvZiBmID09ICd1bmRlZmluZWQnKSBmID0gMC4zXG4gICAgaWYgKHR5cGVvZiB0ID09ICd1bmRlZmluZWQnKSB0ID0gMC42XG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcblxuICAgIHZhciBtID0gMFxuICAgIHZhciBkeDEgPSAwXG4gICAgdmFyIGR5MSA9IDBcbiAgICBsZXQgZHgyID0gMFxuICAgIGxldCBkeTIgPSAwXG5cbiAgICB2YXIgcHJlUCA9IHBvaW50c1swXVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyUCA9IHBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4UCA9IHBvaW50c1tpICsgMV1cbiAgICAgIGlmIChuZXhQKSB7XG4gICAgICAgIG0gPSBncmFkaWVudChwcmVQLCBuZXhQKVxuICAgICAgICBkeDIgPSAobmV4UC54IC0gY3VyUC54KSAqIC1mXG4gICAgICAgIGR5MiA9IGR4MiAqIG0gKiB0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkeDIgPSAwXG4gICAgICAgIGR5MiA9IDBcbiAgICAgIH1cbiAgICAgIGN0eC5iZXppZXJDdXJ2ZVRvKHByZVAueCAtIGR4MSwgcHJlUC55IC0gZHkxLCBjdXJQLnggKyBkeDIsIGN1clAueSArIGR5MiwgY3VyUC54LCBjdXJQLnkpXG4gICAgICBkeDEgPSBkeDJcbiAgICAgIGR5MSA9IGR5MlxuICAgICAgcHJlUCA9IGN1clBcbiAgICB9XG4gICAgLy8gY3R4LnN0cm9rZSgpO1xuICB9XG4gIGJ6Q3VydmUocG9pbnRzLCAuMywgMSlcbiAgY3R4LnN0cm9rZSgpXG59XG5cblxuXG5leHBvcnQgY29uc3QgZHJhd0xpbmVzID0gKHByb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQgfSkgPT4ge1xuICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW3Byb3BzWzBdXTogY29sb3JzWzFdLFxuICAgIFtwcm9wc1sxXV06IGNvbG9yc1syXSxcbiAgICBbcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW3Byb3BzWzNdXTogY29sb3JzWzRdXG4gIH1cblxuICAvLyBjbGVhciBjYW52YXMgZm9yIG5ldyBmcmFtZVxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BzKSB7XG4gICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZW5kZXJlZExpbmVzW3Byb3BdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSByZW5kZXJlZExpbmVzW3Byb3BdW2ldXG4gICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIGkgPT0gc2VsZWN0ZWQgPyAzIDogMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJsZXQgbiA9IDBcblxuLy8gcmF0ZSBsaW1pdGVkIGxvZ2dpbmdcbmNvbnN0IGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gIGlmKG4gJSA2MCA9PSAwKSB7XG4gICAgY29uc29sZS5sb2coLi4uYXJncylcbiAgICBuID0gMFxuICB9XG59XG5cblxuZXhwb3J0IGNvbnN0IGdldEluc3BlY3Rpb25EZXRhaWxzID0gKG1vZGUsIHpvbmVzLCBpbnNwZWN0UG9pbnQsIHJlbmRlcmVkKSA9PiB7XG4gIG4gKz0gMVxuXG4gIGNvbnN0IFsgdGltZSwgeSBdID0gaW5zcGVjdFBvaW50XG5cbiAgbGV0IGRhdGEgPSB7XG4gICAgem9uZTogLTEsXG4gICAgcG9pbnQ6IHsgeDogLTEsIHk6IC0xIH0sXG4gICAgaW5kZXg6IC0xLFxuICAgIHBvaW50SW5kZXg6IC0xXG4gIH1cblxuICBpZihtb2RlICE9ICdpbnNwZWN0JykgcmV0dXJuIGRhdGFcblxuICBsZXQgc2VsZWN0ZWREaXN0YW5jZVxuXG4gIGxldCBzdGFtcHMgPSBbXVxuXG4gIGZvcihsZXQgWyBwcm9wZXJ0eSwgbGluZXMgXSBvZiBPYmplY3QuZW50cmllcyhyZW5kZXJlZCkpIHtcbiAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcblxuICAgICAgLy8gZmluZCBjbG9zZXN0IHggdmFsdWVzIG9uIGVpdGhlciBzaWRlIG9mIGluc3BlY3RlZCB4XG4gICAgICBpZighc3RhbXBzWzBdKSB7XG4gICAgICAgIGxldCBtaW5HYXAgPSA5OTk5OTk5OTk5OVxuICAgICAgICBsZXQgY2xvc2VzdFxuICAgICAgICBmb3IobGV0IHBvaW50IG9mIGxpbmUpIHtcbiAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gTWF0aC5hYnMocG9pbnQudGltZSAtIHRpbWUpXG4gICAgICAgICAgaWYoeE9mZnNldCA8IG1pbkdhcCkge1xuICAgICAgICAgICAgY2xvc2VzdCA9IHBvaW50XG4gICAgICAgICAgICBtaW5HYXAgPSB4T2Zmc2V0XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlkeCA9IGxpbmUuaW5kZXhPZihjbG9zZXN0KVxuICAgICAgICBmb3IobGV0IG8gb2YgWyAxLCAyLCAzLCA0IF0pIHtcbiAgICAgICAgICBpZihpZHggLSBvID49IDApIHtcbiAgICAgICAgICAgIHN0YW1wcy5wdXNoKGxpbmVbaWR4IC0gb10ueClcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYoaWR4ICsgbyA8PSBsaW5lLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHN0YW1wcy5wdXNoKGxpbmVbaWR4ICsgb10ueClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc3RhbXBzLnNvcnQoKVxuICAgICAgfVxuXG4gICAgICAvLyBmaW5kIHBvaW50cyBmb3IgdGhpcyBsaW5lIHdpdGggeCB2YWx1ZXMgbWF0Y2hpbmcgdGhlIHNldCBkZXRlcm1pbmVkIGFib3ZlXG4gICAgICBjb25zdCBwb2ludHMgPSBzdGFtcHMubWFwKHN0YW1wID0+IGxpbmUuZmluZChwID0+IHAueCA9PSBzdGFtcCkpLmZpbHRlcih4ID0+ICEheClcblxuICAgICAgaWYocG9pbnRzWzBdKSB7XG4gICAgICAgIC8vIGdldCBtaW4gZGlzdGFuY2UgZnJvbSBwb2ludHMvc2VnbWVudHMgYW5kIGNsb3Nlc3QgcG9pbnRcbiAgICAgICAgY29uc3QgeyBkaXN0YW5jZSwgY2xvc2VzdCB9ID0gbWluRGlzdGFuY2UocG9pbnRzLCB7IHRpbWUsIHkgfSlcblxuICAgICAgICBpZihkaXN0YW5jZSA8IHNlbGVjdGVkRGlzdGFuY2UgfHwgc2VsZWN0ZWREaXN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGxpbmVzLmluZGV4T2YobGluZSlcbiAgICAgICAgICBkYXRhLnpvbmUgPSB6b25lc1tkYXRhLmluZGV4XVxuICAgICAgICAgIGRhdGEucG9pbnQgPSBjbG9zZXN0XG4gICAgICAgICAgZGF0YS5wb2ludEluZGV4ID0gbGluZS5pbmRleE9mKGNsb3Nlc3QpXG4gICAgICAgICAgZGF0YS5wcm9wZXJ0eSA9IHByb3BlcnR5XG4gICAgICAgICAgc2VsZWN0ZWREaXN0YW5jZSA9IGRpc3RhbmNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGF0YVxufVxuXG5cbi8vIHNpbXBsZSBkaXN0YW5jZSBjYWxjdWxhdGlvbiBiZXR3ZWVuIHR3byBwb2ludHNcbmNvbnN0IGdldERpc3RhbmNlID0gKHAxLCBwMikgPT4ge1xuICBjb25zdCBhID0gcDEudGltZSAtIHAyLnRpbWVcbiAgY29uc3QgYiA9IHAxLnkgLSBwMi55XG4gIHJldHVybiBNYXRoLnNxcnQoYSAqIGEgKyBiICogYilcbn1cblxuXG4vLyBnZXQgc2hvcnRlc3QgZGlzdGFuY2UgYmV0d2VlbiBhIGxpbmUgc2VnbWVudCBhbmQgYSBwb2ludFxuZnVuY3Rpb24gZ2V0U2VnbWVudERpc3RhbmNlKGwxLCBsMiwgcCkge1xuICBjb25zdCB4ID0gcC50aW1lXG4gIGNvbnN0IHkgPSBwLnlcbiAgY29uc3QgeDEgPSBsMS50aW1lXG4gIGNvbnN0IHkxID0gbDEueVxuICBjb25zdCB4MiA9IGwyLnRpbWVcbiAgY29uc3QgeTIgPSBsMi55XG5cbiAgdmFyIEEgPSB4IC0geDFcbiAgdmFyIEIgPSB5IC0geTFcbiAgdmFyIEMgPSB4MiAtIHgxXG4gIHZhciBEID0geTIgLSB5MVxuXG4gIHZhciBkb3QgPSBBICogQyArIEIgKiBEXG4gIHZhciBsZW5fc3EgPSBDICogQyArIEQgKiBEXG4gIHZhciBwYXJhbSA9IC0xXG4gIGlmIChsZW5fc3EgIT0gMCkgLy9pbiBjYXNlIG9mIDAgbGVuZ3RoIGxpbmVcbiAgICBwYXJhbSA9IGRvdCAvIGxlbl9zcVxuXG4gIHZhciB4eCwgeXlcblxuICBpZiAocGFyYW0gPCAwKSB7XG4gICAgeHggPSB4MVxuICAgIHl5ID0geTFcbiAgfVxuICBlbHNlIGlmIChwYXJhbSA+IDEpIHtcbiAgICB4eCA9IHgyXG4gICAgeXkgPSB5MlxuICB9XG4gIGVsc2Uge1xuICAgIHh4ID0geDEgKyBwYXJhbSAqIENcbiAgICB5eSA9IHkxICsgcGFyYW0gKiBEXG4gIH1cblxuICB2YXIgZHggPSB4IC0geHhcbiAgdmFyIGR5ID0geSAtIHl5XG4gIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpXG59XG5cbi8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBvZiBpbnNwZWN0aW9uIHBvaW50IGZyb20gcG9pbnRzIGFuZC9vciBsaW5lIHNlZ21lbnRzXG5jb25zdCBtaW5EaXN0YW5jZSA9IChwb2ludHMsIHRhcmdldCkgPT4ge1xuICBsZXQgY2xvc2VzdFxuICBsZXQgcG9pbnREaXN0YW5jZSA9IG51bGxcbiAgbGV0IGxpbmVEaXN0YW5jZSA9IDk5OTk5OTk5OVxuICBmb3IobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcG9pbnQgPSBwb2ludHNbaV1cbiAgICBjb25zdCBkID0gZ2V0RGlzdGFuY2UocG9pbnQsIHRhcmdldClcbiAgICBpZihwb2ludERpc3RhbmNlID09PSBudWxsIHx8IGQgPCBwb2ludERpc3RhbmNlKSB7XG4gICAgICBjbG9zZXN0ID0gcG9pbnRcbiAgICAgIHBvaW50RGlzdGFuY2UgPSBkXG4gICAgfVxuICAgIGlmKGkgPiAwKSB7XG4gICAgICBsaW5lRGlzdGFuY2UgPSBNYXRoLm1pbihsaW5lRGlzdGFuY2UsIGdldFNlZ21lbnREaXN0YW5jZShwb2ludHNbaV0sIHBvaW50c1tpIC0gMV0sIHRhcmdldCkpXG4gICAgfVxuICB9XG4gIHJldHVybiB7IGNsb3Nlc3QsIGRpc3RhbmNlOiBNYXRoLm1pbihsaW5lRGlzdGFuY2UsIHBvaW50RGlzdGFuY2UpIH1cbn1cbiIsImltcG9ydCBidWZmZXIgZnJvbSAnLi9idWZmZXInXG5pbXBvcnQgeyBkcmF3TGluZXMgfSBmcm9tICcuL2xpbmUtdXRpbHMnXG5pbXBvcnQgeyBnZXRJbnNwZWN0aW9uRGV0YWlscyB9IGZyb20gJy4vaW5zcGVjdGlvbidcblxuXG4vKipcbiAqIEdlbmVyYXRlIGNhbnZhcyBmcmFtZSBiYXNlZCBvbiBjdXJyZW50IGJ1ZmZlci9jb25maWdcbiAqIEBwYXJhbSB7T2JqZWN0fSBjaGFydERhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxvZ1N0YXRzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzdWJtaXRMaW5lc1xuICovXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKSA9PiB7XG4gIGNvbnN0IHsgY2FudmFzLCBjdHgsIHNjYWxlLCBwYXVzZWQsIGJ1ZmZlclBhcmFtcywgcG9zaXRpb24sIG1vZGUsIGluc3BlY3RlZFBvaW50IH0gPSBjaGFydERhdGFcblxuICBsZXQgeyB6b25lcywgamFuayB9ID0gY2hhcnREYXRhXG5cbiAgem9uZXMgPSB6b25lcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgLy8gcmVuZGVyIG11bHRpcGxlIGNvcGllcyBvZiBlYWNoIGxpbmUgZm9yIHN0cmVzcyB0ZXN0aW5nXG4gIGlmKGphbmspIHtcbiAgICB6b25lcyA9IHpvbmVzLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpXG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICB9XG5cbiAgY29uc3QgeyByYXRlIH0gPSBidWZmZXJQYXJhbXNcblxuICBjb25zdCBfcHJvcHMgPSBjaGFydERhdGEucHJvcGVydGllc1xuICBjb25zdCBwcm9wZXJ0aWVzID0gX3Byb3BzLmZpbHRlcih4ID0+ICEheClcblxuICBsZXQgbWF4TGluZVBvaW50cyA9IE1hdGgubWluKDcwMCwgTWF0aC5tYXgoODAsIDIwMDAwIC8gKHpvbmVzLmxlbmd0aCAqIHByb3BlcnRpZXMubGVuZ3RoKSkpICogKGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC8gNClcblxuICBjb25zdCB7IHhNaW4sIHhNYXgsIGRYLCB4U2NhbGUsIHZhbGlkLCB4UmFuZ2UgfSA9IGdldFhQYXJhbWV0ZXJzKHBvc2l0aW9uLCBjYW52YXMsIHNjYWxlLCBwYXVzZWQpXG4gIGlmKCF2YWxpZCkgcmV0dXJuXG5cbiAgY29uc3QgcmVuZGVyTGltaXQgPSB4TWluIC0gMjAwMFxuICBjb25zdCBzYW1wbGUgPSBidWZmZXIuYWN0aXZlLmZpbHRlcih4ID0+IHgudGltZSA+PSByZW5kZXJMaW1pdClcblxuICAvLyBkZXRlcm1pbmUgd2hpY2ggcG9pbnRzIHNob3VsZCBiZSBmaWx0ZXJlZCBiYXNlZCBvbiBtYXggcG9pbnRzIHBlciBsaW5lXG4gIGNvbnN0IG1pbk1TSW50ZXJ2YWwgPSBkWCAvIG1heExpbmVQb2ludHNcblxuICBjb25zdCByZW5kZXJlZCA9IHNhbXBsZS5maWx0ZXIoeCA9PiB7XG4gICAgY29uc3QgdmFsaWRUaW1lID0gKHgudGltZSAtIDE2MTQ3OTkxNjAwMDApICUgbWluTVNJbnRlcnZhbCA8IDIwMDAgLyByYXRlXG4gICAgcmV0dXJuIHggPT0gc2FtcGxlWzBdIHx8IHggPT0gc2FtcGxlW3NhbXBsZS5sZW5ndGggLSAxXSB8fCB2YWxpZFRpbWVcbiAgfSlcblxuXG4gIC8vIHJlbmRlcmVkLnJldmVyc2UoKVxuXG4gIGxldCBsaW5lcyA9IHt9XG4gIGxldCByZW5kZXJlZExpbmVzID0ge31cblxuICBsZXQgbWF4ID0ge31cbiAgbGV0IG1pbiA9IHt9XG4gIGxldCBhdmcgPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cbiAgbGV0IHlWYWx1ZXMgPSB7fVxuICBsZXQgdG90YWxQb2ludHMgPSAwXG4gIGNvbnN0IG9mZnNldFkgPSBwb3NpdGlvbi5wYW5ZXG5cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gICAgem9uZXMuZm9yRWFjaCh4ID0+IGxpbmVzW3Byb3BdW3ggLSAxXSA9IFtdKVxuXG5cbiAgICAvLyBjYWxjdWxhdGUgeCB2YWx1ZXMgaW4gcGl4ZWxzLCBnYXRoZXIgeSBheGlzIGRhdGFcbiAgICBmb3IgKGxldCBmcmFtZSBvZiByZW5kZXJlZCkge1xuICAgICAgY29uc3QgeCA9IChmcmFtZS50aW1lIC0geE1pbikgKiB4U2NhbGVcblxuICAgICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgICBjb25zdCBwb2ludCA9IGZyYW1lLmRhdGFbeiAtIDFdXG5cbiAgICAgICAgbGV0IHkgPSBwb2ludFtwcm9wXVxuICAgICAgICBpZiAocHJvcCA9PSAnZGV2aWF0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MocG9pbnQpXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm1hbnVhbCkge1xuICAgICAgICAgICAgeSA9IHBvaW50Lm1hbnVhbF9zcCAtIHBvaW50LmFjdHVhbF9wZXJjZW50XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC50ZW1wX3NwIC0gcG9pbnQuYWN0dWFsX3RlbXBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGluZXNbcHJvcF1beiAtIDFdLnB1c2goeyB4LCB5LCB0aW1lOiBmcmFtZS50cyB9KVxuICAgICAgICBtYXhbcHJvcF0gPSBNYXRoLm1heChtYXhbcHJvcF0sIHkpXG4gICAgICAgIG1pbltwcm9wXSA9IE1hdGgubWluKG1pbltwcm9wXSwgeSlcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueVtwcm9wXVxuICAgIGNvbnN0IHsgbWluWSwgbWF4WSB9ID0gZ2V0WVBhcmFtZXRlcnMocHJvcCwgbWluW3Byb3BdLCBtYXhbcHJvcF0sIHNjYWxlUGFyYW1zLCBwb3NpdGlvbilcblxuICAgIG1pbltwcm9wXSA9IG1pbllcbiAgICBtYXhbcHJvcF0gPSBtYXhZXG5cbiAgICAvLyBlc3RhYmxpc2ggcGl4ZWwgdG8gdW5pdCByYXRpb1xuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuXG5cbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSB5IHBpeGVsIHZhbHVlcyBiYXNlZCBvbiBlc3RhYmxpc2hlZCBzY2FsZVxuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lc1twcm9wXS5maWx0ZXIoeCA9PiAhIXgpKSB7XG4gICAgICBsZXQgcmVuZGVyZWRMaW5lID0gW11cblxuICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgIHBvaW50LnkgPSBvZmZzZXRZICsgcGFyc2VJbnQoY2FudmFzLmhlaWdodCAtIChwb2ludC55IC0gbWluW3Byb3BdKSAqIGF1dG9TY2FsZVtwcm9wXSlcbiAgICAgICAgcmVuZGVyZWRMaW5lLnB1c2gocG9pbnQpXG4gICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgIH1cblxuICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXS5wdXNoKHJlbmRlcmVkTGluZSlcbiAgICB9XG5cbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuXG4gICAgaWYoeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyA9PSAwKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cblxuICBsZXQgaW5zcGVjdGlvbkRldGFpbHMgPSBnZXRJbnNwZWN0aW9uRGV0YWlscyhtb2RlLCB6b25lcywgaW5zcGVjdGVkUG9pbnQsIHJlbmRlcmVkTGluZXMpXG4gIGluc3BlY3Rpb25EZXRhaWxzLmZyYW1lID0gZ2V0RnJhbWUocmVuZGVyZWQsIGluc3BlY3Rpb25EZXRhaWxzLnBvaW50SW5kZXgsIGluc3BlY3Rpb25EZXRhaWxzLnpvbmUpXG5cbiAgY29uc3Qgc2VsZWN0ZWQgPSBbIGluc3BlY3Rpb25EZXRhaWxzLmluZGV4IF1cblxuICBpZihjYW52YXMgJiYgY3R4KSB7XG4gICAgZHJhd0xpbmVzKF9wcm9wcywgY2FudmFzLCB7IHJlbmRlcmVkTGluZXMsIHNlbGVjdGVkIH0pXG4gIH0gZWxzZSB7XG4gICAgc3VibWl0TGluZXMoeyByZW5kZXJlZExpbmVzLCBzZWxlY3RlZCB9KVxuICB9XG5cbiAgY29uc3QgcGxvdEZpbGxlZCA9IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aFxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQsIGluc3BlY3Rpb25EZXRhaWxzLCB4TWF4LCB4TWluIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRyYXdcblxuXG5cbi8vIHByb3BlcnRpZXMgd2hpY2ggYWxsb3cgbmVnYXRpdmUgdmFsdWVzXG5jb25zdCBuZWdhdGl2ZXMgPSBbICdkZXZpYXRpb24nIF1cblxuY29uc3QgZ2V0Qml0ID0gKGludCwgYml0KSA9PiAhIShpbnQgJiAxIDw8IGJpdClcblxuY29uc3QgZ2V0U2V0dGluZ3MgPSAoem9uZSkgPT4ge1xuICBsZXQgc2V0dGluZ3MgPSB7XG4gICAgbG9ja2VkOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMCksXG4gICAgc2VhbGVkOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMSksXG4gICAgb246IGdldEJpdCh6b25lLnNldHRpbmdzLCAyKSxcbiAgICBhdXRvOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMyksXG4gICAgc3RhbmRieTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDQpLFxuICAgIGJvb3N0OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNSksXG4gICAgdGVzdGluZzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDYpLFxuICAgIHRlc3RfY29tcGxldGU6IGdldEJpdCh6b25lLnNldHRpbmdzLCA3KVxuICB9XG4gIHJldHVybiBzZXR0aW5nc1xufVxuXG5jb25zdCBnZXRGcmFtZSA9IChyZW5kZXJlZCwgaWR4LCB6b25lKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKGlkeCwgem9uZSwgcmVuZGVyZWQubGVuZ3RoKVxuICBjb25zdCBmcmFtZSA9IHJlbmRlcmVkW2lkeF1cbiAgLy8gY29uc29sZS5sb2coZnJhbWUpXG4gIGlmKCFmcmFtZSkgcmV0dXJuIHt9XG4gIHJldHVybiBmcmFtZS5kYXRhW3pvbmUgLSAxXVxufVxuXG4vLyBnZXQgdGhlIHggYXhpcyBib3VuZHNcbmNvbnN0IGdldFhQYXJhbWV0ZXJzID0gKHBvc2l0aW9uLCBjYW52YXMsIHNjYWxlLCBwYXVzZWQpID0+IHtcbiAgY29uc3QgbGF0ZXN0ID0gYnVmZmVyLmFjdGl2ZVtidWZmZXIuYWN0aXZlLmxlbmd0aCAtIDFdXG4gIGlmICghbGF0ZXN0KSByZXR1cm4geyB2YWxpZDogZmFsc2UgfVxuXG4gIGNvbnN0IHhab29tRmFjdG9yID0gcG9zaXRpb24uem9vbVhcbiAgLy8gbGV0IHNSYW5nZSA9IHNjYWxlICYmIHNjYWxlLnggPyBwYXJzZUludChzY2FsZS54KSA6IDEwXG4gIGxldCBzUmFuZ2UgPSBwYXJzZUludChzY2FsZS54KVxuXG4gIGNvbnN0IHhSYW5nZSA9IHNSYW5nZSAqIDEwMDBcblxuICBsZXQgcGFuWFJhdGlvID0gcG9zaXRpb24ucGFuWCAvIGNhbnZhcy53aWR0aFxuICBsZXQgdGltZU9mZnNldCA9IHhSYW5nZSAqIHBhblhSYXRpb1xuXG4gIGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMTAwMCwgLjAxICogeFJhbmdlKVxuXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gZGVsYXkgLSB0aW1lT2Zmc2V0XG4gIGxldCByYXdYTWF4ID0gcGF1c2VkID8gbGF0ZXN0LnRpbWUgLSBkZWxheSAqIC4yNSAtIHRpbWVPZmZzZXQgOiBub3dcbiAgbGV0IHJhd1hNaW4gPSByYXdYTWF4IC0geFJhbmdlXG5cbiAgbGV0IG1pZCA9IHJhd1hNaW4gKyB4UmFuZ2UgLyAyXG4gIGNvbnN0IHNjYWxlZCA9IHhSYW5nZSAqIHhab29tRmFjdG9yIC8gMlxuXG4gIGNvbnN0IHhNYXggPSBtaWQgKyBzY2FsZWRcbiAgY29uc3QgeE1pbiA9IG1pZCAtIHNjYWxlZFxuXG4gIGNvbnN0IGRYID0geE1heCAtIHhNaW5cbiAgY29uc3QgeFNjYWxlID0gY2FudmFzLndpZHRoIC8gKHhNYXggLSB4TWluKVxuXG4gIHJldHVybiB7IHhNaW4sIHhNYXgsIHhSYW5nZSwgZFgsIHhTY2FsZSwgdmFsaWQ6IHRydWUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMClcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuICBjb25zdCBzY2FsZWRNaW4gPSBtaW5cbiAgY29uc3Qgc2NhbGVkTWF4ID0gbWF4XG5cbiAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICBjb25zdCBldmVuID0gaSA9PiB7XG4gICAgaWYgKG1pbkF1dG8pIG1pbiA9IC1pICsgaSAqIE1hdGguY2VpbChtaW4gLyBpKVxuICAgIGlmIChtYXhBdXRvKSBtYXggPSBpICsgaSAqIE1hdGguZmxvb3IobWF4IC8gaSlcbiAgfVxuXG5cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIGNvbnN0IG1heE9mZnNldCA9IHNjYWxlZE1heCAtIG1heCAvIChtYXggLSBtaW4pXG4gIGNvbnN0IG1pbk9mZnNldCA9IHNjYWxlZE1pbiAtIG1pbiAvIChtYXggLSBtaW4pXG5cbiAgcmV0dXJuIHsgbWluWTogbWluLCBtYXhZOiBtYXgsIG1heE9mZnNldCwgbWluT2Zmc2V0IH1cbn1cbiIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpIFxuICAgIH0gZWxzZSB7XG4gICAgICBwb3N0TWVzc2FnZVxuICAgIH1cbiAgfVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5sZXQgcmVxdWVzdEFuaW1GcmFtZVxudHJ5IHtcbiAgcmVxdWVzdEFuaW1GcmFtZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZVxufSBjYXRjaChlKSB7XG4gIHRyeSB7XG4gICAgcmVxdWVzdEFuaW1GcmFtZSA9IHdlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB9IGNhdGNoKGUpIHtcbiAgICB0cnkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IG1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbiAqLyBjYWxsYmFjaywgLyogRE9NRWxlbWVudCAqLyBlbGVtZW50KSB7XG4gICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG5sZXQgcmVmcmVzaFJhdGUgPSA2MFxuXG4vLyBnZXQgcmVmcmVzaCByYXRlIGZvciBjdXJyZW50IGRpc3BsYXlcbmNvbnN0IGdldFJlZnJlc2hSYXRlID0gYXN5bmMgKGZyYW1lcyA9IDYwKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGxhc3RcbiAgICBjb25zdCB0aW1lcyA9IFtdXG4gICAgY29uc3QgZ2V0VGltZSA9IG4gPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgIGlmKGxhc3QpIHRpbWVzLnB1c2gobm93IC0gbGFzdClcbiAgICAgIGxhc3QgPSBub3dcblxuICAgICAgaWYobiA9PSAwKSB7XG4gICAgICAgIGNvbnN0IHRvdGFsID0gdGltZXMucmVkdWNlKCh0b3RhbCwgdCkgPT4gdG90YWwgKyB0LCAwKVxuICAgICAgICBjb25zdCBhdmcgPSB0b3RhbCAvIHRpbWVzLmxlbmd0aFxuICAgICAgICByZXNvbHZlKDEwMDAgLyBhdmcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0QW5pbUZyYW1lKCgpID0+IGdldFRpbWUobiAtIDEpKVxuICAgICAgfVxuICAgIH1cbiAgICBnZXRUaW1lKGZyYW1lcylcbiAgfSlcbn1cblxuZ2V0UmVmcmVzaFJhdGUoMTAwMCkudGhlbihyYXRlID0+IHtcbiAgaWYocmF0ZSA8IDQwKSB7XG4gICAgcmVmcmVzaFJhdGUgPSAzMFxuICB9XG4gIC8vIGNvbnNvbGUubG9nKHJlZnJlc2hSYXRlKVxufSlcblxuXG5jb25zdCByZW5kZXJlcnMgPSB7XG4gICdsaW5lJzogcmVuZGVyTGluZVxufVxuXG5sZXQgY2hhcnREYXRhID0ge1xuICBjYW52YXM6IG51bGwsXG4gIGN0eDogbnVsbCxcbiAgdHlwZTogJycsXG4gIHByb3BlcnRpZXM6IFtdLFxuICBzY2FsZToge1xuICAgIHg6IDEwLFxuICAgIHk6ICdhdXRvJ1xuICB9LFxuICBidWZmZXJQYXJhbXM6IHtcbiAgICByYXRlOiAxMFxuICB9LFxuICAvLyBjdXJyZW50IGRhdGFwb2ludCBkZW5zaXR5IHNldHRpbmcgKDEgLSA0KVxuICByZXNvbHV0aW9uOiA0XG59XG5cbmxldCBwb3J0XG5cblxubGV0IHN0YXRzID0ge31cbmNvbnN0IGxvZ1N0YXRzID0gcyA9PiBzdGF0cyA9IHsgLi4uc3RhdHMsIC4uLnMgfVxuXG4vLyBtb3N0IHJlY2VudCBzZXQgb2YgcmVuZGVyIHRpbWVzICh0byBkZXRlcm1pbmUgZnJhbWUgcmF0ZSlcbmxldCByZW5kZXJUaW1lcyA9IFtdXG5cbi8vIGZyYW1lcmF0ZSBzbmFwc2hvdHMgdG8gbW9uaXRvciBzeXN0ZW0gc3RyYWluXG5sZXQgcGVyZm9ybWFuY2VIaXN0b3J5ID0gW11cblxuLy8gdHJhY2sgbW9zdCByZWNlbnQgXG5sZXQgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4vLyB0cmFjayBudW1iZXIgb2YgdGltZXMgbWF4IFJlc29sdXRpb24gcmVjb21tZW5kZWRcbmxldCBtYXhSZXNDb3VudCA9IDBcblxuXG5cbmxldCBsYXN0ID0gMFxuY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gIGlmIChyZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKSB7XG4gICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc2NhbGUnLCB2YWx1ZTogeyB4TWF4OiBzdGF0cy54TWF4LCB4TWluOiBzdGF0cy54TWluLCBvZmZzZXRzOiBzdGF0cy5vZmZzZXRzLCBpbnNwZWN0aW9uOiBzdGF0cy5pbnNwZWN0aW9uRGV0YWlscyB9fSlcbiAgICByZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKVxuICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICB9XG4gIGxhc3QgPSB0XG4gIHJlcXVlc3RBbmltRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1GcmFtZShkcmF3KVxuXG5jb25zdCBzdWJtaXRMaW5lcyA9IGxpbmVzID0+IHtcbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnbGluZXMnLCBsaW5lcyB9KVxufVxuXG5jb25zdCBjb2xsZWN0U3RhdHMgPSAoKSA9PiB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG5cbiAgY29uc3QgdG90YWxSZW5kZXIgPSByZW5kZXJUaW1lcy5yZWR1Y2UoKHQsIHRvdGFsKSA9PiB0b3RhbCArIHQsIDApXG4gIGNvbnN0IGF2Z1JlbmRlciA9IHRvdGFsUmVuZGVyIC8gcmVuZGVyVGltZXMubGVuZ3RoXG4gIGNvbnN0IGZyYW1lcmF0ZSA9IE1hdGguY2VpbCgxMDAwIC8gYXZnUmVuZGVyKVxuICBwZXJmb3JtYW5jZUhpc3RvcnkucHVzaChmcmFtZXJhdGUpXG5cbiAgLy8ga2VlcCBsYXN0IDEwcyBvZiBmcmFtZXJhdGUgZGF0YSBmb3IgcGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xuICBwZXJmb3JtYW5jZUhpc3RvcnkgPSBwZXJmb3JtYW5jZUhpc3Rvcnkuc2xpY2UoLTMwKVxuXG4gIC8vIHRydW5jYXRlIGZyYW1lIGRhdGEgdG8ga2VlcCBhIHJvbGxpbmcgYXZlcmFnZVxuICByZW5kZXJUaW1lcyA9IHJlbmRlclRpbWVzLnNsaWNlKC02MClcblxuICAvLyBpZiBlbm91Z2ggdGltZSBoYXMgcGFzc2VkLCBjYWxjdWxhdGUgcmVjb21tZW5kZWQgcmVzb2x1dGlvblxuICBpZihub3cgLSBsYXN0UmVzb2x1dGlvbkNoYW5nZSA+IDEwMDApIHtcbiAgICBsYXN0UmVzb2x1dGlvbkNoYW5nZSA9IG5vd1xuXG4gICAgY29uc3QgcmVjb21tZW5kZWQgPSBNYXRoLmNlaWwoKGZyYW1lcmF0ZSAtIDE1KSAqIDQgLyAocmVmcmVzaFJhdGUgLSAxNSkpXG5cbiAgICBpZihyZWNvbW1lbmRlZCA+IDMgJiYgY2hhcnREYXRhLnJlc29sdXRpb24gPT0gMykge1xuICAgICAgaWYobWF4UmVzQ291bnQgPiAzKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gNFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF4UmVzQ291bnQgKz0gMVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYXhSZXNDb3VudCA9IDBcblxuICAgICAgLy8gZW5zdXJlIHdlJ3JlIGFpbWluZyBmb3IgcmVjb21tZW5kZWQgKy8tIDFcbiAgICAgIGlmIChyZWNvbW1lbmRlZCAtIDEgPiBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiArPSAxXG4gICAgICB9IGVsc2UgaWYgKHJlY29tbWVuZGVkICsgMSA8IGNoYXJ0RGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC09IDFcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjbGFtcCBhdCAxIC0gNFxuICAgIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oY2hhcnREYXRhLnJlc29sdXRpb24sIDQpKVxuXG4gICAgc3RhdHMucmVzb2x1dGlvbiA9IGNoYXJ0RGF0YS5yZXNvbHV0aW9uXG4gIH1cblxuICBzdGF0cyA9IHsgLi4uc3RhdHMsIGZyYW1lcmF0ZSB9XG4gIGNoYXJ0RGF0YS5mcmFtZXJhdGUgPSBmcmFtZXJhdGVcblxuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGF0cycsIHZhbHVlOiBzdGF0cyB9KVxufVxuXG5zZXRJbnRlcnZhbChjb2xsZWN0U3RhdHMsIDEwMDAgLyAzKVxuXG5cblxuXG5jb25zdCBpbml0aWFsaXplID0gYXN5bmMgKCkgPT4ge1xuICBwb3J0Lm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuICAgIGlmKGRhdGEgPT0gJ3Jlc2V0Jykge1xuICAgICAgYnVmZmVyLnJlc2V0KClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGNoYXJ0RGF0YS5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgaWYgKGRhdGEudXBkYXRlICYmIGRhdGEudXBkYXRlLmxlbmd0aCA9PSBtYXhDaHVua1NpemUpIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSBmYWxzZVxuICAgICAgfVxuICAgICAgYnVmZmVyLndyaXRlKGRhdGEudXBkYXRlKVxuICAgIH1cbiAgfVxuXG4gIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAncmVhZEJ1ZmZlcicgfSlcbn1cblxuXG5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgaWYgKGUuZGF0YS53c1BvcnQpIHtcbiAgICBwb3J0ID0gZS5kYXRhLndzUG9ydFxuICAgIGluaXRpYWxpemUoKVxuICB9IGVsc2UgaWYgKGUuZGF0YSA9PSAnY2xvc2UnKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjbG9zZScgfSlcbiAgfSBlbHNlIHtcbiAgICBjaGFydERhdGEgPSB7IC4uLmNoYXJ0RGF0YSwgLi4uZS5kYXRhIH1cbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgZGF0YScsIGNoYXJ0RGF0YSlcbiAgICBpZiAoY2hhcnREYXRhLnBhdXNlZCkge1xuICAgICAgYnVmZmVyLnBhdXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyLnBsYXkoKVxuICAgIH1cbiAgICBpZiAoZS5kYXRhLmNhbnZhcyAmJiBlLmRhdGEuY2FudmFzLmdldENvbnRleHQpIHtcbiAgICAgIGNoYXJ0RGF0YS5jdHggPSBjaGFydERhdGEuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJidWZmZXIiLCJkcmF3IiwicmVuZGVyTGluZSJdLCJtYXBwaW5ncyI6Ijs7O0VBQUEsSUFBSUEsUUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7QUFDQUEsVUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksRUFBRTtFQUM5QjtFQUNBLEVBQUVBLFFBQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQy9FLEVBQUVBLFFBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDaEQsRUFBRSxHQUFHLENBQUNBLFFBQU0sQ0FBQyxNQUFNLEVBQUU7RUFDckIsSUFBSUEsUUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEdBQUU7RUFDekMsR0FBRztFQUNILEVBQUM7QUFDREEsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsT0FBTyxHQUFHLEdBQUU7QUFDeENBLFVBQU0sQ0FBQyxJQUFJLEdBQUcs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QUssRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEdBQUcsVUFBUztBQUNoRztFQUNBLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxVQUFTO0FBQ2pDO0VBQ0EsRUFBRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztBQUNoQztFQUNBO0VBQ0EsRUFBRSxHQUFHLElBQUksRUFBRTtFQUNYLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDM0QsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMzRCxHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxhQUFZO0FBQy9CO0VBQ0EsRUFBRSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVTtFQUNyQyxFQUFFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxFQUFFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUM7QUFDMUg7RUFDQSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLGNBQWMsQ0FB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
