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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvaW5zcGVjdGlvbi5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2xpbmUtcGxvdC5qcyIsIi4uLy4uL3NyYy9kYXRhL3JlYWx0aW1lL2J1ZmZlci5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2NoYXJ0LXdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYnVmZmVyID0ge1xuICBlbnRyaWVzOiBbXSxcbiAgYWN0aXZlOiBbXSxcbiAgcGF1c2VkOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZycsIGRhdGEpXG4gIGJ1ZmZlci5lbnRyaWVzID0gWyAuLi5idWZmZXIuZW50cmllcywgLi4uZGF0YSBdLmZpbHRlcih4ID0+ICEheCkuc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgMTogJyNBMTAzRkYnLFxuICAyOiAnI0ZGOUMwMycsXG4gIDM6ICcjMDNDRkZGJyxcbiAgNDogJyMyRTAzRkYnXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNtb290aChjdHgsIHBvaW50cywgY29sb3IsIHdpZHRoKSB7XG4gIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yXG4gIGN0eC5saW5lV2lkdGggPSB3aWR0aFxuICAvLyBjdHguc3Ryb2tlUmVjdCgyMCwgMjAsIDE1MCwgMTAwKVxuXG4gIGN0eC5iZWdpblBhdGgoKVxuICBpZiAocG9pbnRzID09IHVuZGVmaW5lZCB8fCBwb2ludHMubGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDEpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIGlmIChwb2ludHMubGVuZ3RoID09IDIpIHtcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgICBjdHgubGluZVRvKHBvaW50c1sxXS54LCBwb2ludHNbMV0ueSlcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaWYocG9pbnRzLmxlbmd0aCA8IDMpIHJldHVyblxuICAvLyBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcbiAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gIC8vICAgLy8gY3R4LmxpbmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnkpXG4gIC8vICAgdmFyIHhjID0gKHBvaW50c1tpXS54ICsgcG9pbnRzW2kgKyAxXS54KSAvIDJcbiAgLy8gICB2YXIgeWMgPSAocG9pbnRzW2ldLnkgKyBwb2ludHNbaSArIDFdLnkpIC8gMlxuICAvLyAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAvLyAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgeGMsIHljKVxuICAvLyB9XG4gIC8vIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSwgcG9pbnRzW2kgKyAxXS54LCBwb2ludHNbaSArIDFdLnkpXG5cbiAgZnVuY3Rpb24gZ3JhZGllbnQoYSwgYikge1xuICAgIHJldHVybiAoYi55IC0gYS55KSAvIChiLnggLSBhLngpXG4gIH1cblxuICBmdW5jdGlvbiBiekN1cnZlKHBvaW50cywgZiwgdCkge1xuICAgIC8vZiA9IDAsIHdpbGwgYmUgc3RyYWlnaHQgbGluZVxuICAgIC8vdCBzdXBwb3NlIHRvIGJlIDEsIGJ1dCBjaGFuZ2luZyB0aGUgdmFsdWUgY2FuIGNvbnRyb2wgdGhlIHNtb290aG5lc3MgdG9vXG4gICAgaWYgKHR5cGVvZiBmID09ICd1bmRlZmluZWQnKSBmID0gMC4zXG4gICAgaWYgKHR5cGVvZiB0ID09ICd1bmRlZmluZWQnKSB0ID0gMC42XG5cbiAgICBjdHguYmVnaW5QYXRoKClcbiAgICBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcblxuICAgIHZhciBtID0gMFxuICAgIHZhciBkeDEgPSAwXG4gICAgdmFyIGR5MSA9IDBcbiAgICBsZXQgZHgyID0gMFxuICAgIGxldCBkeTIgPSAwXG5cbiAgICB2YXIgcHJlUCA9IHBvaW50c1swXVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyUCA9IHBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4UCA9IHBvaW50c1tpICsgMV1cbiAgICAgIGlmIChuZXhQKSB7XG4gICAgICAgIG0gPSBncmFkaWVudChwcmVQLCBuZXhQKVxuICAgICAgICBkeDIgPSAobmV4UC54IC0gY3VyUC54KSAqIC1mXG4gICAgICAgIGR5MiA9IGR4MiAqIG0gKiB0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkeDIgPSAwXG4gICAgICAgIGR5MiA9IDBcbiAgICAgIH1cbiAgICAgIGN0eC5iZXppZXJDdXJ2ZVRvKHByZVAueCAtIGR4MSwgcHJlUC55IC0gZHkxLCBjdXJQLnggKyBkeDIsIGN1clAueSArIGR5MiwgY3VyUC54LCBjdXJQLnkpXG4gICAgICBkeDEgPSBkeDJcbiAgICAgIGR5MSA9IGR5MlxuICAgICAgcHJlUCA9IGN1clBcbiAgICB9XG4gICAgLy8gY3R4LnN0cm9rZSgpO1xuICB9XG4gIGJ6Q3VydmUocG9pbnRzLCAuMywgMSlcbiAgY3R4LnN0cm9rZSgpXG59XG5cblxuXG5leHBvcnQgY29uc3QgZHJhd0xpbmVzID0gKHByb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQgfSkgPT4ge1xuICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW3Byb3BzWzBdXTogY29sb3JzWzFdLFxuICAgIFtwcm9wc1sxXV06IGNvbG9yc1syXSxcbiAgICBbcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW3Byb3BzWzNdXTogY29sb3JzWzRdXG4gIH1cblxuICAvLyBjbGVhciBjYW52YXMgZm9yIG5ldyBmcmFtZVxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BzKSB7XG4gICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZW5kZXJlZExpbmVzW3Byb3BdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSByZW5kZXJlZExpbmVzW3Byb3BdW2ldXG4gICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIGkgPT0gc2VsZWN0ZWQgPyAzIDogMSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0iLCJsZXQgbiA9IDBcblxuLy8gcmF0ZSBsaW1pdGVkIGxvZ2dpbmdcbmNvbnN0IGxvZyA9ICguLi5hcmdzKSA9PiB7XG4gIGlmKG4gJSA2MCA9PSAwKSB7XG4gICAgY29uc29sZS5sb2coLi4uYXJncylcbiAgICBuID0gMFxuICB9XG59XG5cblxuZXhwb3J0IGNvbnN0IGdldEluc3BlY3Rpb25EZXRhaWxzID0gKG1vZGUsIHpvbmVzLCBpbnNwZWN0UG9pbnQsIHJlbmRlcmVkKSA9PiB7XG4gIG4gKz0gMVxuXG4gIGNvbnN0IFsgdGltZSwgeSBdID0gaW5zcGVjdFBvaW50XG5cbiAgbGV0IGRhdGEgPSB7XG4gICAgem9uZTogLTEsXG4gICAgcG9pbnQ6IHsgeDogLTEsIHk6IC0xIH0sXG4gICAgaW5kZXg6IC0xLFxuICAgIHBvaW50SW5kZXg6IC0xXG4gIH1cblxuICBpZihtb2RlICE9ICdpbnNwZWN0JykgcmV0dXJuIGRhdGFcblxuICBsZXQgc2VsZWN0ZWREaXN0YW5jZVxuXG4gIGxldCBzdGFtcHMgPSBbXVxuXG4gIGZvcihsZXQgWyBwcm9wZXJ0eSwgbGluZXMgXSBvZiBPYmplY3QuZW50cmllcyhyZW5kZXJlZCkpIHtcbiAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcblxuICAgICAgLy8gZmluZCBjbG9zZXN0IHggdmFsdWVzIG9uIGVpdGhlciBzaWRlIG9mIGluc3BlY3RlZCB4XG4gICAgICBpZighc3RhbXBzWzBdKSB7XG4gICAgICAgIGxldCBtaW5HYXAgPSA5OTk5OTk5OTk5OVxuICAgICAgICBsZXQgY2xvc2VzdFxuICAgICAgICBmb3IobGV0IHBvaW50IG9mIGxpbmUpIHtcbiAgICAgICAgICBjb25zdCB4T2Zmc2V0ID0gTWF0aC5hYnMocG9pbnQudGltZSAtIHRpbWUpXG4gICAgICAgICAgaWYoeE9mZnNldCA8IG1pbkdhcCkge1xuICAgICAgICAgICAgY2xvc2VzdCA9IHBvaW50XG4gICAgICAgICAgICBtaW5HYXAgPSB4T2Zmc2V0XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlkeCA9IGxpbmUuaW5kZXhPZihjbG9zZXN0KVxuICAgICAgICBmb3IobGV0IG8gb2YgWyAxLCAyLCAzLCA0IF0pIHtcbiAgICAgICAgICBpZihpZHggLSBvID49IDApIHtcbiAgICAgICAgICAgIHN0YW1wcy5wdXNoKGxpbmVbaWR4IC0gb10ueClcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYoaWR4ICsgbyA8PSBsaW5lLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHN0YW1wcy5wdXNoKGxpbmVbaWR4ICsgb10ueClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc3RhbXBzLnNvcnQoKVxuICAgICAgfVxuXG4gICAgICAvLyBmaW5kIHBvaW50cyBmb3IgdGhpcyBsaW5lIHdpdGggeCB2YWx1ZXMgbWF0Y2hpbmcgdGhlIHNldCBkZXRlcm1pbmVkIGFib3ZlXG4gICAgICBjb25zdCBwb2ludHMgPSBzdGFtcHMubWFwKHN0YW1wID0+IGxpbmUuZmluZChwID0+IHAueCA9PSBzdGFtcCkpLmZpbHRlcih4ID0+ICEheClcblxuICAgICAgaWYocG9pbnRzWzBdKSB7XG4gICAgICAgIC8vIGdldCBtaW4gZGlzdGFuY2UgZnJvbSBwb2ludHMvc2VnbWVudHMgYW5kIGNsb3Nlc3QgcG9pbnRcbiAgICAgICAgY29uc3QgeyBkaXN0YW5jZSwgY2xvc2VzdCB9ID0gbWluRGlzdGFuY2UocG9pbnRzLCB7IHRpbWUsIHkgfSlcblxuICAgICAgICBpZihkaXN0YW5jZSA8IHNlbGVjdGVkRGlzdGFuY2UgfHwgc2VsZWN0ZWREaXN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGF0YS5pbmRleCA9IGxpbmVzLmluZGV4T2YobGluZSlcbiAgICAgICAgICBkYXRhLnpvbmUgPSB6b25lc1tkYXRhLmluZGV4XVxuICAgICAgICAgIGRhdGEucG9pbnQgPSBjbG9zZXN0XG4gICAgICAgICAgZGF0YS5wb2ludEluZGV4ID0gbGluZS5pbmRleE9mKGNsb3Nlc3QpXG4gICAgICAgICAgZGF0YS5wcm9wZXJ0eSA9IHByb3BlcnR5XG4gICAgICAgICAgc2VsZWN0ZWREaXN0YW5jZSA9IGRpc3RhbmNlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGF0YVxufVxuXG5cbi8vIHNpbXBsZSBkaXN0YW5jZSBjYWxjdWxhdGlvbiBiZXR3ZWVuIHR3byBwb2ludHNcbmNvbnN0IGdldERpc3RhbmNlID0gKHAxLCBwMikgPT4ge1xuICBjb25zdCBhID0gcDEudGltZSAtIHAyLnRpbWVcbiAgY29uc3QgYiA9IHAxLnkgLSBwMi55XG4gIHJldHVybiBNYXRoLnNxcnQoYSAqIGEgKyBiICogYilcbn1cblxuXG4vLyBnZXQgc2hvcnRlc3QgZGlzdGFuY2UgYmV0d2VlbiBhIGxpbmUgc2VnbWVudCBhbmQgYSBwb2ludFxuZnVuY3Rpb24gZ2V0U2VnbWVudERpc3RhbmNlKGwxLCBsMiwgcCkge1xuICBjb25zdCB4ID0gcC50aW1lXG4gIGNvbnN0IHkgPSBwLnlcbiAgY29uc3QgeDEgPSBsMS50aW1lXG4gIGNvbnN0IHkxID0gbDEueVxuICBjb25zdCB4MiA9IGwyLnRpbWVcbiAgY29uc3QgeTIgPSBsMi55XG5cbiAgdmFyIEEgPSB4IC0geDFcbiAgdmFyIEIgPSB5IC0geTFcbiAgdmFyIEMgPSB4MiAtIHgxXG4gIHZhciBEID0geTIgLSB5MVxuXG4gIHZhciBkb3QgPSBBICogQyArIEIgKiBEXG4gIHZhciBsZW5fc3EgPSBDICogQyArIEQgKiBEXG4gIHZhciBwYXJhbSA9IC0xXG4gIGlmIChsZW5fc3EgIT0gMCkgLy9pbiBjYXNlIG9mIDAgbGVuZ3RoIGxpbmVcbiAgICBwYXJhbSA9IGRvdCAvIGxlbl9zcVxuXG4gIHZhciB4eCwgeXlcblxuICBpZiAocGFyYW0gPCAwKSB7XG4gICAgeHggPSB4MVxuICAgIHl5ID0geTFcbiAgfVxuICBlbHNlIGlmIChwYXJhbSA+IDEpIHtcbiAgICB4eCA9IHgyXG4gICAgeXkgPSB5MlxuICB9XG4gIGVsc2Uge1xuICAgIHh4ID0geDEgKyBwYXJhbSAqIENcbiAgICB5eSA9IHkxICsgcGFyYW0gKiBEXG4gIH1cblxuICB2YXIgZHggPSB4IC0geHhcbiAgdmFyIGR5ID0geSAtIHl5XG4gIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpXG59XG5cbi8vIGNhbGN1bGF0ZSBkaXN0YW5jZSBvZiBpbnNwZWN0aW9uIHBvaW50IGZyb20gcG9pbnRzIGFuZC9vciBsaW5lIHNlZ21lbnRzXG5jb25zdCBtaW5EaXN0YW5jZSA9IChwb2ludHMsIHRhcmdldCkgPT4ge1xuICBsZXQgY2xvc2VzdFxuICBsZXQgcG9pbnREaXN0YW5jZSA9IG51bGxcbiAgbGV0IGxpbmVEaXN0YW5jZSA9IDk5OTk5OTk5OVxuICBmb3IobGV0IGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcG9pbnQgPSBwb2ludHNbaV1cbiAgICBjb25zdCBkID0gZ2V0RGlzdGFuY2UocG9pbnQsIHRhcmdldClcbiAgICBpZihwb2ludERpc3RhbmNlID09PSBudWxsIHx8IGQgPCBwb2ludERpc3RhbmNlKSB7XG4gICAgICBjbG9zZXN0ID0gcG9pbnRcbiAgICAgIHBvaW50RGlzdGFuY2UgPSBkXG4gICAgfVxuICAgIGlmKGkgPiAwKSB7XG4gICAgICBsaW5lRGlzdGFuY2UgPSBNYXRoLm1pbihsaW5lRGlzdGFuY2UsIGdldFNlZ21lbnREaXN0YW5jZShwb2ludHNbaV0sIHBvaW50c1tpIC0gMV0sIHRhcmdldCkpXG4gICAgfVxuICB9XG4gIHJldHVybiB7IGNsb3Nlc3QsIGRpc3RhbmNlOiBNYXRoLm1pbihsaW5lRGlzdGFuY2UsIHBvaW50RGlzdGFuY2UpIH1cbn1cbiIsImltcG9ydCBidWZmZXIgZnJvbSAnLi9idWZmZXInXG5pbXBvcnQgeyBkcmF3TGluZXMgfSBmcm9tICcuL2xpbmUtdXRpbHMnXG5pbXBvcnQgeyBnZXRJbnNwZWN0aW9uRGV0YWlscyB9IGZyb20gJy4vaW5zcGVjdGlvbidcblxuXG4vKipcbiAqIEdlbmVyYXRlIGNhbnZhcyBmcmFtZSBiYXNlZCBvbiBjdXJyZW50IGJ1ZmZlci9jb25maWdcbiAqIEBwYXJhbSB7T2JqZWN0fSBjaGFydERhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxvZ1N0YXRzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzdWJtaXRMaW5lc1xuICovXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMsIHN1Ym1pdExpbmVzKSA9PiB7XG4gIGNvbnN0IHsgY2FudmFzLCBjdHgsIHNjYWxlLCBwYXVzZWQsIGJ1ZmZlclBhcmFtcywgcG9zaXRpb24sIG1vZGUsIGluc3BlY3RlZFBvaW50IH0gPSBjaGFydERhdGFcblxuICBsZXQgeyB6b25lcywgamFuayB9ID0gY2hhcnREYXRhXG5cbiAgem9uZXMgPSB6b25lcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgLy8gcmVuZGVyIG11bHRpcGxlIGNvcGllcyBvZiBlYWNoIGxpbmUgZm9yIHN0cmVzcyB0ZXN0aW5nXG4gIGlmKGphbmspIHtcbiAgICB6b25lcyA9IHpvbmVzLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpXG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICB9XG5cbiAgY29uc3QgeyByYXRlIH0gPSBidWZmZXJQYXJhbXNcblxuICBjb25zdCBfcHJvcHMgPSBjaGFydERhdGEucHJvcGVydGllc1xuICBjb25zdCBwcm9wZXJ0aWVzID0gX3Byb3BzLmZpbHRlcih4ID0+ICEheClcblxuICBsZXQgbWF4TGluZVBvaW50cyA9IE1hdGgubWluKDcwMCwgTWF0aC5tYXgoODAsIDIwMDAwIC8gKHpvbmVzLmxlbmd0aCAqIHByb3BlcnRpZXMubGVuZ3RoKSkpICogKGNoYXJ0RGF0YS5yZXNvbHV0aW9uIC8gNClcblxuICBjb25zdCB7IHhNaW4sIHhNYXgsIGRYLCB4U2NhbGUsIHZhbGlkLCB4UmFuZ2UgfSA9IGdldFhQYXJhbWV0ZXJzKHBvc2l0aW9uLCBjYW52YXMsIHNjYWxlLCBwYXVzZWQpXG4gIGlmKCF2YWxpZCkgcmV0dXJuXG5cbiAgY29uc3QgcmVuZGVyTGltaXQgPSB4TWluIC0gMjAwMFxuICBjb25zdCBzYW1wbGUgPSBidWZmZXIuYWN0aXZlLmZpbHRlcih4ID0+IHgudGltZSA+PSByZW5kZXJMaW1pdClcblxuICAvLyBkZXRlcm1pbmUgd2hpY2ggcG9pbnRzIHNob3VsZCBiZSBmaWx0ZXJlZCBiYXNlZCBvbiBtYXggcG9pbnRzIHBlciBsaW5lXG4gIGNvbnN0IG1pbk1TSW50ZXJ2YWwgPSBkWCAvIG1heExpbmVQb2ludHNcblxuICBjb25zdCByZW5kZXJlZCA9IHNhbXBsZS5maWx0ZXIoeCA9PiB7XG4gICAgY29uc3QgdmFsaWRUaW1lID0gKHgudGltZSAtIDE2MTQ3OTkxNjAwMDApICUgbWluTVNJbnRlcnZhbCA8IDIwMDAgLyByYXRlXG4gICAgcmV0dXJuIHggPT0gc2FtcGxlWzBdIHx8IHggPT0gc2FtcGxlW3NhbXBsZS5sZW5ndGggLSAxXSB8fCB2YWxpZFRpbWVcbiAgfSlcblxuXG4gIC8vIHJlbmRlcmVkLnJldmVyc2UoKVxuXG4gIGxldCBsaW5lcyA9IHt9XG4gIGxldCByZW5kZXJlZExpbmVzID0ge31cblxuICBsZXQgbWF4ID0ge31cbiAgbGV0IG1pbiA9IHt9XG4gIGxldCBhdmcgPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cbiAgbGV0IHlWYWx1ZXMgPSB7fVxuICBsZXQgdG90YWxQb2ludHMgPSAwXG4gIGNvbnN0IG9mZnNldFkgPSBwb3NpdGlvbi5wYW5ZXG5cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gICAgem9uZXMuZm9yRWFjaCh4ID0+IGxpbmVzW3Byb3BdW3ggLSAxXSA9IFtdKVxuXG5cbiAgICAvLyBjYWxjdWxhdGUgeCB2YWx1ZXMgaW4gcGl4ZWxzLCBnYXRoZXIgeSBheGlzIGRhdGFcbiAgICBmb3IgKGxldCBmcmFtZSBvZiByZW5kZXJlZCkge1xuICAgICAgY29uc3QgeCA9IChmcmFtZS50aW1lIC0geE1pbikgKiB4U2NhbGVcblxuICAgICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgICBjb25zdCBwb2ludCA9IGZyYW1lLmRhdGFbeiAtIDFdXG5cbiAgICAgICAgbGV0IHkgPSBwb2ludFtwcm9wXVxuICAgICAgICBpZiAocHJvcCA9PSAnZGV2aWF0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MocG9pbnQpXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm1hbnVhbCkge1xuICAgICAgICAgICAgeSA9IHBvaW50Lm1hbnVhbF9zcCAtIHBvaW50LmFjdHVhbF9wZXJjZW50XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC50ZW1wX3NwIC0gcG9pbnQuYWN0dWFsX3RlbXBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGluZXNbcHJvcF1beiAtIDFdLnB1c2goeyB4LCB5LCB0aW1lOiBmcmFtZS50cyB9KVxuICAgICAgICBtYXhbcHJvcF0gPSBNYXRoLm1heChtYXhbcHJvcF0sIHkpXG4gICAgICAgIG1pbltwcm9wXSA9IE1hdGgubWluKG1pbltwcm9wXSwgeSlcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueVtwcm9wXVxuICAgIGNvbnN0IHsgbWluWSwgbWF4WSB9ID0gZ2V0WVBhcmFtZXRlcnMocHJvcCwgbWluW3Byb3BdLCBtYXhbcHJvcF0sIHNjYWxlUGFyYW1zLCBwb3NpdGlvbilcblxuICAgIG1pbltwcm9wXSA9IG1pbllcbiAgICBtYXhbcHJvcF0gPSBtYXhZXG5cbiAgICAvLyBlc3RhYmxpc2ggcGl4ZWwgdG8gdW5pdCByYXRpb1xuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuXG5cbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSB5IHBpeGVsIHZhbHVlcyBiYXNlZCBvbiBlc3RhYmxpc2hlZCBzY2FsZVxuICAgIGZvcihsZXQgbGluZSBvZiBsaW5lc1twcm9wXS5maWx0ZXIoeCA9PiAhIXgpKSB7XG4gICAgICBsZXQgcmVuZGVyZWRMaW5lID0gW11cblxuICAgICAgZm9yIChsZXQgcG9pbnQgb2YgbGluZSkge1xuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgIHBvaW50LnkgPSBvZmZzZXRZICsgcGFyc2VJbnQoY2FudmFzLmhlaWdodCAtIChwb2ludC55IC0gbWluW3Byb3BdKSAqIGF1dG9TY2FsZVtwcm9wXSlcbiAgICAgICAgcmVuZGVyZWRMaW5lLnB1c2gocG9pbnQpXG4gICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgIH1cblxuICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXS5wdXNoKHJlbmRlcmVkTGluZSlcbiAgICB9XG5cbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuXG4gICAgaWYoeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyA9PSAwKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cblxuICBsZXQgaW5zcGVjdGlvbkRldGFpbHMgPSBnZXRJbnNwZWN0aW9uRGV0YWlscyhtb2RlLCB6b25lcywgaW5zcGVjdGVkUG9pbnQsIHJlbmRlcmVkTGluZXMpXG4gIGluc3BlY3Rpb25EZXRhaWxzLmZyYW1lID0gZ2V0RnJhbWUocmVuZGVyZWQsIGluc3BlY3Rpb25EZXRhaWxzLnBvaW50SW5kZXgsIGluc3BlY3Rpb25EZXRhaWxzLnpvbmUpXG5cbiAgY29uc3Qgc2VsZWN0ZWQgPSBbIGluc3BlY3Rpb25EZXRhaWxzLmluZGV4IF1cblxuICBpZihjYW52YXMgJiYgY3R4KSB7XG4gICAgZHJhd0xpbmVzKF9wcm9wcywgY2FudmFzLCB7IHJlbmRlcmVkTGluZXMsIHNlbGVjdGVkIH0pXG4gIH0gZWxzZSB7XG4gICAgc3VibWl0TGluZXMoeyByZW5kZXJlZExpbmVzLCBzZWxlY3RlZCB9KVxuICB9XG5cbiAgY29uc3QgcGxvdEZpbGxlZCA9IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aFxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQsIGluc3BlY3Rpb25EZXRhaWxzLCB4TWF4LCB4TWluIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRyYXdcblxuXG5cbi8vIHByb3BlcnRpZXMgd2hpY2ggYWxsb3cgbmVnYXRpdmUgdmFsdWVzXG5jb25zdCBuZWdhdGl2ZXMgPSBbICdkZXZpYXRpb24nIF1cblxuY29uc3QgZ2V0Qml0ID0gKGludCwgYml0KSA9PiAhIShpbnQgJiAxIDw8IGJpdClcblxuY29uc3QgZ2V0U2V0dGluZ3MgPSAoem9uZSkgPT4ge1xuICBsZXQgc2V0dGluZ3MgPSB7XG4gICAgbG9ja2VkOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMCksXG4gICAgc2VhbGVkOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMSksXG4gICAgb246IGdldEJpdCh6b25lLnNldHRpbmdzLCAyKSxcbiAgICBhdXRvOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgMyksXG4gICAgc3RhbmRieTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDQpLFxuICAgIGJvb3N0OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNSksXG4gICAgdGVzdGluZzogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDYpLFxuICAgIHRlc3RfY29tcGxldGU6IGdldEJpdCh6b25lLnNldHRpbmdzLCA3KVxuICB9XG4gIHJldHVybiBzZXR0aW5nc1xufVxuXG5jb25zdCBnZXRGcmFtZSA9IChyZW5kZXJlZCwgaWR4LCB6b25lKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKGlkeCwgem9uZSwgcmVuZGVyZWQubGVuZ3RoKVxuICBjb25zdCBmcmFtZSA9IHJlbmRlcmVkW2lkeF1cbiAgLy8gY29uc29sZS5sb2coZnJhbWUpXG4gIGlmKCFmcmFtZSkgcmV0dXJuIHt9XG4gIHJldHVybiBmcmFtZS5kYXRhW3pvbmUgLSAxXVxufVxuXG4vLyBnZXQgdGhlIHggYXhpcyBib3VuZHNcbmNvbnN0IGdldFhQYXJhbWV0ZXJzID0gKHBvc2l0aW9uLCBjYW52YXMsIHNjYWxlLCBwYXVzZWQpID0+IHtcbiAgY29uc3QgbGF0ZXN0ID0gYnVmZmVyLmFjdGl2ZVtidWZmZXIuYWN0aXZlLmxlbmd0aCAtIDFdXG4gIGlmICghbGF0ZXN0KSByZXR1cm4geyB2YWxpZDogZmFsc2UgfVxuXG4gIGNvbnN0IHhab29tRmFjdG9yID0gcG9zaXRpb24uem9vbVhcbiAgLy8gbGV0IHNSYW5nZSA9IHNjYWxlICYmIHNjYWxlLnggPyBwYXJzZUludChzY2FsZS54KSA6IDEwXG4gIGxldCBzUmFuZ2UgPSBwYXJzZUludChzY2FsZS54KVxuXG4gIGNvbnN0IHhSYW5nZSA9IHNSYW5nZSAqIDEwMDBcblxuICBsZXQgcGFuWFJhdGlvID0gcG9zaXRpb24ucGFuWCAvIGNhbnZhcy53aWR0aFxuICBsZXQgdGltZU9mZnNldCA9IHhSYW5nZSAqIHBhblhSYXRpb1xuXG4gIGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMTAwMCwgLjAxICogeFJhbmdlKVxuXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gZGVsYXkgLSB0aW1lT2Zmc2V0XG4gIGxldCByYXdYTWF4ID0gcGF1c2VkID8gbGF0ZXN0LnRpbWUgLSBkZWxheSAqIC4yNSAtIHRpbWVPZmZzZXQgOiBub3dcbiAgbGV0IHJhd1hNaW4gPSByYXdYTWF4IC0geFJhbmdlXG5cbiAgbGV0IG1pZCA9IHJhd1hNaW4gKyB4UmFuZ2UgLyAyXG4gIGNvbnN0IHNjYWxlZCA9IHhSYW5nZSAqIHhab29tRmFjdG9yIC8gMlxuXG4gIGNvbnN0IHhNYXggPSBtaWQgKyBzY2FsZWRcbiAgY29uc3QgeE1pbiA9IG1pZCAtIHNjYWxlZFxuXG4gIGNvbnN0IGRYID0geE1heCAtIHhNaW5cbiAgY29uc3QgeFNjYWxlID0gY2FudmFzLndpZHRoIC8gKHhNYXggLSB4TWluKVxuXG4gIHJldHVybiB7IHhNaW4sIHhNYXgsIHhSYW5nZSwgZFgsIHhTY2FsZSwgdmFsaWQ6IHRydWUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMClcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuICBjb25zdCBzY2FsZWRNaW4gPSBtaW5cbiAgY29uc3Qgc2NhbGVkTWF4ID0gbWF4XG5cbiAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICBjb25zdCBldmVuID0gaSA9PiB7XG4gICAgaWYgKG1pbkF1dG8pIG1pbiA9IC1pICsgaSAqIE1hdGguY2VpbChtaW4gLyBpKVxuICAgIGlmIChtYXhBdXRvKSBtYXggPSBpICsgaSAqIE1hdGguZmxvb3IobWF4IC8gaSlcbiAgfVxuXG5cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIGNvbnN0IG1heE9mZnNldCA9IHNjYWxlZE1heCAtIG1heCAvIChtYXggLSBtaW4pXG4gIGNvbnN0IG1pbk9mZnNldCA9IHNjYWxlZE1pbiAtIG1pbiAvIChtYXggLSBtaW4pXG5cbiAgcmV0dXJuIHsgbWluWTogbWluLCBtYXhZOiBtYXgsIG1heE9mZnNldCwgbWluT2Zmc2V0IH1cbn1cbiIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgfVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiBuZXcgRGF0ZSh1cGRhdGVkVFMpLCB0czogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2gobmV4dCksIDUwMClcbn1cblxuXG5cbmNvbnN0IHR5cGVTaXplcyA9IHtcbiAgXCJ1bmRlZmluZWRcIjogKCkgPT4gMCxcbiAgXCJib29sZWFuXCI6ICgpID0+IDQsXG4gIFwibnVtYmVyXCI6ICgpID0+IDgsXG4gIFwic3RyaW5nXCI6IGl0ZW0gPT4gMiAqIGl0ZW0ubGVuZ3RoLFxuICBcIm9iamVjdFwiOiBpdGVtID0+ICFpdGVtID8gMCA6IE9iamVjdFxuICAgIC5rZXlzKGl0ZW0pXG4gICAgLnJlZHVjZSgodG90YWwsIGtleSkgPT4gc2l6ZU9mKGtleSkgKyBzaXplT2YoaXRlbVtrZXldKSArIHRvdGFsLCAwKVxufVxuXG5jb25zdCBzaXplT2YgPSB2YWx1ZSA9PiB0eXBlU2l6ZXNbdHlwZW9mIHZhbHVlXSh2YWx1ZSlcbiIsImltcG9ydCByZW5kZXJMaW5lIGZyb20gJy4vbGluZS1wbG90J1xuaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IG1heENodW5rU2l6ZSB9IGZyb20gJy4uL3JlYWx0aW1lL2J1ZmZlcidcblxubGV0IHJlcXVlc3RBbmltRnJhbWVcbnRyeSB7XG4gIHJlcXVlc3RBbmltRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbn0gY2F0Y2goZSkge1xuICB0cnkge1xuICAgIHJlcXVlc3RBbmltRnJhbWUgPSB3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfSBjYXRjaChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb24gKi8gY2FsbGJhY2ssIC8qIERPTUVsZW1lbnQgKi8gZWxlbWVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxubGV0IHJlZnJlc2hSYXRlID0gNjBcblxuLy8gZ2V0IHJlZnJlc2ggcmF0ZSBmb3IgY3VycmVudCBkaXNwbGF5XG5jb25zdCBnZXRSZWZyZXNoUmF0ZSA9IGFzeW5jIChmcmFtZXMgPSA2MCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBsYXN0XG4gICAgY29uc3QgdGltZXMgPSBbXVxuICAgIGNvbnN0IGdldFRpbWUgPSBuID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICBpZihsYXN0KSB0aW1lcy5wdXNoKG5vdyAtIGxhc3QpXG4gICAgICBsYXN0ID0gbm93XG5cbiAgICAgIGlmKG4gPT0gMCkge1xuICAgICAgICBjb25zdCB0b3RhbCA9IHRpbWVzLnJlZHVjZSgodG90YWwsIHQpID0+IHRvdGFsICsgdCwgMClcbiAgICAgICAgY29uc3QgYXZnID0gdG90YWwgLyB0aW1lcy5sZW5ndGhcbiAgICAgICAgcmVzb2x2ZSgxMDAwIC8gYXZnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEFuaW1GcmFtZSgoKSA9PiBnZXRUaW1lKG4gLSAxKSlcbiAgICAgIH1cbiAgICB9XG4gICAgZ2V0VGltZShmcmFtZXMpXG4gIH0pXG59XG5cbmdldFJlZnJlc2hSYXRlKDEwMDApLnRoZW4ocmF0ZSA9PiB7XG4gIGlmKHJhdGUgPCA0MCkge1xuICAgIHJlZnJlc2hSYXRlID0gMzBcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhyZWZyZXNoUmF0ZSlcbn0pXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfSxcbiAgYnVmZmVyUGFyYW1zOiB7XG4gICAgcmF0ZTogMTBcbiAgfSxcbiAgLy8gY3VycmVudCBkYXRhcG9pbnQgZGVuc2l0eSBzZXR0aW5nICgxIC0gNClcbiAgcmVzb2x1dGlvbjogNFxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuLy8gbW9zdCByZWNlbnQgc2V0IG9mIHJlbmRlciB0aW1lcyAodG8gZGV0ZXJtaW5lIGZyYW1lIHJhdGUpXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG4vLyBmcmFtZXJhdGUgc25hcHNob3RzIHRvIG1vbml0b3Igc3lzdGVtIHN0cmFpblxubGV0IHBlcmZvcm1hbmNlSGlzdG9yeSA9IFtdXG5cbi8vIHRyYWNrIG1vc3QgcmVjZW50IFxubGV0IGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuLy8gdHJhY2sgbnVtYmVyIG9mIHRpbWVzIG1heCBSZXNvbHV0aW9uIHJlY29tbWVuZGVkXG5sZXQgbWF4UmVzQ291bnQgPSAwXG5cblxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3NjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiwgb2Zmc2V0czogc3RhdHMub2Zmc2V0cywgaW5zcGVjdGlvbjogc3RhdHMuaW5zcGVjdGlvbkRldGFpbHMgfX0pXG4gICAgcmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXShjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcylcbiAgICByZW5kZXJUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbGFzdClcbiAgfVxuICBsYXN0ID0gdFxuICByZXF1ZXN0QW5pbUZyYW1lKGRyYXcpXG59XG5cbnJlcXVlc3RBbmltRnJhbWUoZHJhdylcblxuY29uc3Qgc3VibWl0TGluZXMgPSBsaW5lcyA9PiB7XG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ2xpbmVzJywgbGluZXMgfSlcbn1cblxuY29uc3QgY29sbGVjdFN0YXRzID0gKCkgPT4ge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLmNlaWwoMTAwMCAvIGF2Z1JlbmRlcilcbiAgcGVyZm9ybWFuY2VIaXN0b3J5LnB1c2goZnJhbWVyYXRlKVxuXG4gIC8vIGtlZXAgbGFzdCAxMHMgb2YgZnJhbWVyYXRlIGRhdGEgZm9yIHBlcmZvcm1hbmNlIG1vbml0b3JpbmdcbiAgcGVyZm9ybWFuY2VIaXN0b3J5ID0gcGVyZm9ybWFuY2VIaXN0b3J5LnNsaWNlKC0zMClcblxuICAvLyB0cnVuY2F0ZSBmcmFtZSBkYXRhIHRvIGtlZXAgYSByb2xsaW5nIGF2ZXJhZ2VcbiAgcmVuZGVyVGltZXMgPSByZW5kZXJUaW1lcy5zbGljZSgtNjApXG5cbiAgLy8gaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCwgY2FsY3VsYXRlIHJlY29tbWVuZGVkIHJlc29sdXRpb25cbiAgaWYobm93IC0gbGFzdFJlc29sdXRpb25DaGFuZ2UgPiAxMDAwKSB7XG4gICAgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBub3dcblxuICAgIGNvbnN0IHJlY29tbWVuZGVkID0gTWF0aC5jZWlsKChmcmFtZXJhdGUgLSAxNSkgKiA0IC8gKHJlZnJlc2hSYXRlIC0gMTUpKVxuXG4gICAgaWYocmVjb21tZW5kZWQgPiAzICYmIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID09IDMpIHtcbiAgICAgIGlmKG1heFJlc0NvdW50ID4gMykge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IDRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heFJlc0NvdW50ICs9IDFcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWF4UmVzQ291bnQgPSAwXG5cbiAgICAgIC8vIGVuc3VyZSB3ZSdyZSBhaW1pbmcgZm9yIHJlY29tbWVuZGVkICsvLSAxXG4gICAgICBpZiAocmVjb21tZW5kZWQgLSAxID4gY2hhcnREYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gKz0gMVxuICAgICAgfSBlbHNlIGlmIChyZWNvbW1lbmRlZCArIDEgPCBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiAtPSAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY2xhbXAgYXQgMSAtIDRcbiAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IE1hdGgubWF4KDEsIE1hdGgubWluKGNoYXJ0RGF0YS5yZXNvbHV0aW9uLCA0KSlcblxuICAgIHN0YXRzLnJlc29sdXRpb24gPSBjaGFydERhdGEucmVzb2x1dGlvblxuICB9XG5cbiAgc3RhdHMgPSB7IC4uLnN0YXRzLCBmcmFtZXJhdGUgfVxuICBjaGFydERhdGEuZnJhbWVyYXRlID0gZnJhbWVyYXRlXG5cbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RhdHMnLCB2YWx1ZTogc3RhdHMgfSlcbn1cblxuc2V0SW50ZXJ2YWwoY29sbGVjdFN0YXRzLCAxMDAwIC8gMylcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMgJiYgZS5kYXRhLmNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwiZHJhdyIsInJlbmRlckxpbmUiXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUlBLFFBQU0sR0FBRztFQUNiLEVBQUUsT0FBTyxFQUFFLEVBQUU7RUFDYixFQUFFLE1BQU0sRUFBRSxFQUFFO0VBQ1osRUFBRSxNQUFNLEVBQUUsS0FBSztFQUNmLEVBQUM7QUFHRDtBQUNBO0FBQ0FBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7RUFDOUI7RUFDQSxFQUFFQSxRQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBQztFQUMvRSxFQUFFQSxRQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ2hELEVBQUUsR0FBRyxDQUFDQSxRQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUlBLFFBQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxHQUFFO0VBQ3pDLEdBQUc7RUFDSCxFQUFDO0FBQ0RBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFFO0FBQ3hDQSxVQUFNLENBQUMsSUFBSSxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxNQUFNLEdBQUcsTUFBSztBQUN6Q0EsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHOztFQ25COUIsTUFBTSxNQUFNLEdBQUc7RUFDdEIsRUFBRSxDQUFDLEVBQUUsU0FBUztFQUNkLEVBQUUsQ0FBQyxFQUFFLFNBQVM7RUFDZCxFQUFFLENBQUMsRUFBRSxTQUFTO0VBQ2QsRUFBRSxDQUFDLEVBQUUsU0FBUztFQUNkLEVBQUM7QUFDRDtBQUNBO0VBQ08sU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO0VBQ2xELEVBQUUsR0FBRyxDQUFDLFdBQVcsR0FBRyxNQUFLO0VBQ3pCLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxNQUFLO0VBQ3ZCO0FBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDakIsRUFBRSxJQUFJLE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDakQsSUFBSSxPQUFPLElBQUk7RUFDZixHQUFHO0VBQ0gsRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDeEMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN4QyxJQUFJLE9BQU8sSUFBSTtFQUNmLEdBQUc7RUFDSCxFQUFFLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDMUIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN4QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3hDLElBQUksT0FBTyxJQUFJO0VBQ2YsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU07RUFDOUI7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDQSxFQUFFLFNBQVMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7RUFDMUIsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNwQyxHQUFHO0FBQ0g7RUFDQSxFQUFFLFNBQVMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0VBQ2pDO0VBQ0E7RUFDQSxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksV0FBVyxFQUFFLENBQUMsR0FBRyxJQUFHO0VBQ3hDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxHQUFHLElBQUc7QUFDeEM7RUFDQSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDbkIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUN4QztFQUNBLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNiLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBQztFQUNmLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBQztFQUNmLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBQztFQUNmLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBQztBQUNmO0VBQ0EsSUFBSSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFDO0VBQ3hCLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDNUMsTUFBTSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFDO0VBQzFCLE1BQU0sTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUM7RUFDaEMsTUFBTSxJQUFJLElBQUksRUFBRTtFQUNoQixRQUFRLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksRUFBQztFQUNoQyxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUM7RUFDcEMsUUFBUSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFDO0VBQ3pCLE9BQU8sTUFBTTtFQUNiLFFBQVEsR0FBRyxHQUFHLEVBQUM7RUFDZixRQUFRLEdBQUcsR0FBRyxFQUFDO0VBQ2YsT0FBTztFQUNQLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUM7RUFDL0YsTUFBTSxHQUFHLEdBQUcsSUFBRztFQUNmLE1BQU0sR0FBRyxHQUFHLElBQUc7RUFDZixNQUFNLElBQUksR0FBRyxLQUFJO0VBQ2pCLEtBQUs7RUFDTDtFQUNBLEdBQUc7RUFDSCxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBQztFQUN4QixFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUU7RUFDZCxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0VBQ08sTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLO0VBQ3pFLEVBQUUsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDckMsRUFBRSxNQUFNLFVBQVUsR0FBRztFQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztFQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDekIsSUFBRztBQUNIO0VBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUM7QUFDbEQ7RUFDQSxFQUFFLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO0VBQzFCLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDNUIsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUMzRCxRQUFRLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDM0MsUUFBUSxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQ2xFLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztFQUNIOztFQzVGTyxNQUFNLG9CQUFvQixHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsUUFBUSxLQUFLO0FBRTdFO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLGFBQVk7QUFDbEM7RUFDQSxFQUFFLElBQUksSUFBSSxHQUFHO0VBQ2IsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBQ1osSUFBSSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0VBQzNCLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztFQUNiLElBQUksVUFBVSxFQUFFLENBQUMsQ0FBQztFQUNsQixJQUFHO0FBQ0g7RUFDQSxFQUFFLEdBQUcsSUFBSSxJQUFJLFNBQVMsRUFBRSxPQUFPLElBQUk7QUFDbkM7RUFDQSxFQUFFLElBQUksaUJBQWdCO0FBQ3RCO0VBQ0EsRUFBRSxJQUFJLE1BQU0sR0FBRyxHQUFFO0FBQ2pCO0VBQ0EsRUFBRSxJQUFJLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUMzRCxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO0FBQzNCO0VBQ0E7RUFDQSxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDckIsUUFBUSxJQUFJLE1BQU0sR0FBRyxZQUFXO0VBQ2hDLFFBQVEsSUFBSSxRQUFPO0VBQ25CLFFBQVEsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7RUFDL0IsVUFBVSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFDO0VBQ3JELFVBQVUsR0FBRyxPQUFPLEdBQUcsTUFBTSxFQUFFO0VBQy9CLFlBQVksT0FBTyxHQUFHLE1BQUs7RUFDM0IsWUFBWSxNQUFNLEdBQUcsUUFBTztFQUM1QixXQUFXLE1BQU07RUFDakIsWUFBWSxLQUFLO0VBQ2pCLFdBQVc7RUFDWCxTQUFTO0VBQ1QsUUFBUSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBQztFQUN6QyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUNyQyxVQUFVLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDM0IsWUFBWSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3hDLFdBQVc7RUFDWCxVQUFVLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtFQUN6QyxZQUFZLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDeEMsV0FBVztFQUNYLFNBQVM7RUFDVDtFQUNBLE9BQU87QUFDUDtFQUNBO0VBQ0EsTUFBTSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ3ZGO0VBQ0EsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNwQjtFQUNBLFFBQVEsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFDO0FBQ3RFO0VBQ0EsUUFBUSxHQUFHLFFBQVEsR0FBRyxnQkFBZ0IsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7RUFDMUUsVUFBVSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFDO0VBQzFDLFVBQVUsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBQztFQUN2QyxVQUFVLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBTztFQUM5QixVQUFVLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUM7RUFDakQsVUFBVSxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVE7RUFDbEMsVUFBVSxnQkFBZ0IsR0FBRyxTQUFRO0VBQ3JDLFNBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsT0FBTyxJQUFJO0VBQ2IsRUFBQztBQUNEO0FBQ0E7RUFDQTtFQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSztFQUNoQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUk7RUFDN0IsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFDO0VBQ3ZCLEVBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNqQyxFQUFDO0FBQ0Q7QUFDQTtFQUNBO0VBQ0EsU0FBUyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUN2QyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFJO0VBQ2xCLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7RUFDZixFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFJO0VBQ3BCLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUM7RUFDakIsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSTtFQUNwQixFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFDO0FBQ2pCO0VBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRTtFQUNoQixFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFFO0VBQ2hCLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUU7RUFDakIsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRTtBQUNqQjtFQUNBLEVBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztFQUN6QixFQUFFLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7RUFDNUIsRUFBRSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUM7RUFDaEIsRUFBRSxJQUFJLE1BQU0sSUFBSSxDQUFDO0VBQ2pCLElBQUksS0FBSyxHQUFHLEdBQUcsR0FBRyxPQUFNO0FBQ3hCO0VBQ0EsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFFO0FBQ1o7RUFDQSxFQUFFLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtFQUNqQixJQUFJLEVBQUUsR0FBRyxHQUFFO0VBQ1gsSUFBSSxFQUFFLEdBQUcsR0FBRTtFQUNYLEdBQUc7RUFDSCxPQUFPLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtFQUN0QixJQUFJLEVBQUUsR0FBRyxHQUFFO0VBQ1gsSUFBSSxFQUFFLEdBQUcsR0FBRTtFQUNYLEdBQUc7RUFDSCxPQUFPO0VBQ1AsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxFQUFDO0VBQ3ZCLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsRUFBQztFQUN2QixHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFFO0VBQ2pCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUU7RUFDakIsRUFBRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0VBQ3JDLENBQUM7QUFDRDtFQUNBO0VBQ0EsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxLQUFLO0VBQ3hDLEVBQUUsSUFBSSxRQUFPO0VBQ2IsRUFBRSxJQUFJLGFBQWEsR0FBRyxLQUFJO0VBQzFCLEVBQUUsSUFBSSxZQUFZLEdBQUcsVUFBUztFQUM5QixFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ3pDLElBQUksTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBQztFQUMzQixJQUFJLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFDO0VBQ3hDLElBQUksR0FBRyxhQUFhLEtBQUssSUFBSSxJQUFJLENBQUMsR0FBRyxhQUFhLEVBQUU7RUFDcEQsTUFBTSxPQUFPLEdBQUcsTUFBSztFQUNyQixNQUFNLGFBQWEsR0FBRyxFQUFDO0VBQ3ZCLEtBQUs7RUFDTCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtFQUNkLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFDO0VBQ2pHLEtBQUs7RUFDTCxHQUFHO0VBQ0gsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsRUFBRTtFQUNyRTs7RUM1SUE7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTUMsTUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEtBQUs7RUFDbkQsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxHQUFHLFVBQVM7QUFDaEc7RUFDQSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBUztBQUNqQztFQUNBLEVBQUUsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDaEM7RUFDQTtFQUNBLEVBQUUsR0FBRyxJQUFJLEVBQUU7RUFDWCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQzNELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUM7RUFDM0QsR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsYUFBWTtBQUMvQjtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVU7RUFDckMsRUFBRSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzVDO0VBQ0EsRUFBRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFDO0FBQzFIO0VBQ0EsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDO0VBQ25HLEVBQUUsR0FB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
