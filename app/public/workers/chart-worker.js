(function () {
  'use strict';

  let buffer = {
    entries: [],
    active: [],
    paused: false
  };


  buffer.write = function(data) {
    // console.log('updating', data)
    buffer.entries = [ ...buffer.entries, ...data ].filter(x => !!x).slice(-7500);
    buffer.entries.sort((a, b) => a.time - b.time);
    if(!buffer.paused) {
      buffer.active = [ ...buffer.entries ];
    }
  };
  buffer.reset = () => buffer.entries = [];
  buffer.play = () => buffer.paused = false;
  buffer.pause = () => buffer.paused = true;

  const colors = {
    1: '#A103FF',
    2: '#FF9C03',
    3: '#03CFFF',
    4: '#2E03FF'
  };


  function smooth(ctx, points, color, width ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    // ctx.strokeRect(20, 20, 150, 100)

    if(color) ctx.beginPath();
    if (points == undefined || points.length == 0 || points.length < 3) {
      return true
    }
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

      if(color) ctx.beginPath();
      if(color) ctx.moveTo(points[0].x, points[0].y);

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
    if(color) ctx.stroke();
  }

  const avg = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;



  const drawLines = (props, canvas, { renderedLines, selected, renderMode }) => {
    const ctx = canvas.getContext("2d");
    const lineColors = {
      [props[0]]: colors[1],
      [props[1]]: colors[2],
      [props[2]]: colors[3],
      [props[3]]: colors[4]
    };

    // clear canvas for new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(renderMode == 'minmax') {
      for(let prop of props) {
        const lines = renderedLines[prop];
        let minLine = [];
        let maxLine = [];
        let avgLine = [];

        if(lines && lines[0] && lines[0].length) {
          for(let i = 0; i < lines[0].length; i++) {
            let min = 99999999;
            let max = -9999999;
            let x;
            let values = [];
            for(let l of lines) {
              const p = l[i];
              x = p.x;
              values.push(p.y);
              min = p.y < min ? p.y : min;
              max = p.y > max ? p.y : max;
            }
            minLine.push({ x, y: min });
            maxLine.push({ x, y: max });
            avgLine.push({ x, y: avg(values) });
          }
          smooth(ctx, avgLine, lineColors[prop], 3);

          minLine.reverse();

          const region = new Path2D();
          ctx.moveTo(minLine[0].x, minLine[0].y);
          smooth(region, minLine);
          region.lineTo(maxLine[0].x, maxLine[0].y);
          smooth(region, maxLine);
          region.closePath();
          ctx.fillStyle = `${lineColors[prop]}33`;
          ctx.fill(region, 'nonzero');
        }
      }
    } else {
      for (let prop of props) {
        if(renderedLines[prop]) {
          for (let i = 0; i < renderedLines[prop].length; i++) {
            const line = renderedLines[prop][i];
            smooth(ctx, line, lineColors[prop], i == selected ? 3 : 1);
          }
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
  const draw = (chartData, logStats, submitLines) => {
    const { canvas, ctx, scale, paused, bufferParams, position, mode, renderMode, inspectedPoint } = chartData;

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

    const { xMin, xMax, dX, xScale, valid, xRange, delay } = getXParameters(position, canvas, scale, paused, bufferParams);
    if(!valid) return

    const renderLimit = xMin - delay;
    const sample = buffer.active.filter(x => x.time >= renderLimit);

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
            const settings = getSettings(point);
            {
              y = point.actual_temp - point.temp_sp;
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
      drawLines(_props, canvas, { renderedLines, selected, renderMode });
    } else {
      submitLines({ renderedLines, selected, renderMode });
    }

    const plotFilled = sample.length < buffer.active.length;

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
  const getXParameters = (position, canvas, scale, paused, bufferParams) => {
    const latest = buffer.active[buffer.active.length - 1];
    if (!latest) return { valid: false }

    const xZoomFactor = position.zoomX;
    // let sRange = scale && scale.x ? parseInt(scale.x) : 10
    let sRange = parseInt(scale.x);

    const xRange = sRange * 1000;

    let panXRatio = position.panX / canvas.width;
    let timeOffset = xRange * panXRatio;

    const delay = Math.max(1000, 1000 / bufferParams.rate) * 2;

    const now = new Date().getTime() - delay - timeOffset;
    let rawXMax = paused ? latest.time - delay * .25 - timeOffset : now;
    let rawXMin = rawXMax - xRange;

    let mid = rawXMin + xRange / 2;
    const scaled = xRange * xZoomFactor / 2;

    const xMax = mid + scaled;
    const xMin = mid - scaled;

    const dX = xMax - xMin;
    const xScale = canvas.width / (xMax - xMin);

    return { xMin, xMax, xRange, dX, xScale, delay, valid: true }
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

  let buffer$1 = [];


  // ensure buffer is never filled faster than the specified rate
  const tryPush = (frame) => {
    frame.ts = frame.time.getTime();
    const lastFrame = buffer$1[buffer$1.length - 1];
    if(!lastFrame) {
      buffer$1.push(frame);
      return
    }
    // min interval is min ms between frames with 5ms padding
    const minIntvl = 1000 / params.rate + 5;
    if(frame.time - lastFrame.time >= minIntvl) {
      buffer$1.push(frame);
    }
  };

  buffer$1.write = function ({ ts, data }) {

    // simulate 450 zones
    // data = data.concat(data).concat(data)

    const date = new Date(ts);
    const frame = { data, date, time: ts };

    tryPush(frame);
    // tween(frame, 12)

    buffer$1 = buffer$1.slice(-7500);
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
    'line': draw
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
  const draw$1 = () => {
    const t = new Date().getTime();
    if (renderers[chartData.type]) {
      postMessage({ type: 'scale', value: { xMax: stats.xMax, xMin: stats.xMin, offsets: stats.offsets, inspection: stats.inspectionDetails }});
      renderers[chartData.type](chartData, logStats, submitLines);
      renderTimes.push(new Date().getTime() - last);
    }
    last = t;
    requestAnimFrame(draw$1);
  };

  requestAnimFrame(draw$1);

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
        buffer.reset();
      } else {
        stats.bufferParams = data.params;
        chartData.bufferParams = data.params;
        if (data.update && data.update.length == maxChunkSize) {
          stats.loading = true;
        } else {
          stats.loading = false;
        }
        buffer.write(data.update);
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
        buffer.pause();
      } else {
        buffer.play();
      }
      if (e.data.canvas && e.data.canvas.getContext) {
        chartData.ctx = chartData.canvas.getContext("2d");
      }
    }
  };

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvaW5zcGVjdGlvbi5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2xpbmUtcGxvdC5qcyIsIi4uLy4uL3NyYy9kYXRhL3JlYWx0aW1lL2J1ZmZlci5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2NoYXJ0LXdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYnVmZmVyID0ge1xuICBlbnRyaWVzOiBbXSxcbiAgYWN0aXZlOiBbXSxcbiAgcGF1c2VkOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZycsIGRhdGEpXG4gIGJ1ZmZlci5lbnRyaWVzID0gWyAuLi5idWZmZXIuZW50cmllcywgLi4uZGF0YSBdLmZpbHRlcih4ID0+ICEheCkuc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgMTogJyNBMTAzRkYnLFxuICAyOiAnI0ZGOUMwMycsXG4gIDM6ICcjMDNDRkZGJyxcbiAgNDogJyMyRTAzRkYnXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNtb290aChjdHgsIHBvaW50cywgY29sb3IsIHdpZHRoICkge1xuICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvclxuICBjdHgubGluZVdpZHRoID0gd2lkdGhcbiAgLy8gY3R4LnN0cm9rZVJlY3QoMjAsIDIwLCAxNTAsIDEwMClcblxuICBpZihjb2xvcikgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCB8fCBwb2ludHMubGVuZ3RoIDwgMykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLy8gY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIC8vIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAvLyAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAvLyAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gIC8vICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgLy8gICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgLy8gICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgLy8gfVxuICAvLyBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuXG4gIGZ1bmN0aW9uIGdyYWRpZW50KGEsIGIpIHtcbiAgICByZXR1cm4gKGIueSAtIGEueSkgLyAoYi54IC0gYS54KVxuICB9XG5cbiAgZnVuY3Rpb24gYnpDdXJ2ZShwb2ludHMsIGYsIHQpIHtcbiAgICAvL2YgPSAwLCB3aWxsIGJlIHN0cmFpZ2h0IGxpbmVcbiAgICAvL3Qgc3VwcG9zZSB0byBiZSAxLCBidXQgY2hhbmdpbmcgdGhlIHZhbHVlIGNhbiBjb250cm9sIHRoZSBzbW9vdGhuZXNzIHRvb1xuICAgIGlmICh0eXBlb2YgZiA9PSAndW5kZWZpbmVkJykgZiA9IDAuM1xuICAgIGlmICh0eXBlb2YgdCA9PSAndW5kZWZpbmVkJykgdCA9IDAuNlxuXG4gICAgaWYoY29sb3IpIGN0eC5iZWdpblBhdGgoKVxuICAgIGlmKGNvbG9yKSBjdHgubW92ZVRvKHBvaW50c1swXS54LCBwb2ludHNbMF0ueSlcblxuICAgIHZhciBtID0gMFxuICAgIHZhciBkeDEgPSAwXG4gICAgdmFyIGR5MSA9IDBcbiAgICBsZXQgZHgyID0gMFxuICAgIGxldCBkeTIgPSAwXG5cbiAgICB2YXIgcHJlUCA9IHBvaW50c1swXVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyUCA9IHBvaW50c1tpXVxuICAgICAgY29uc3QgbmV4UCA9IHBvaW50c1tpICsgMV1cbiAgICAgIGlmIChuZXhQKSB7XG4gICAgICAgIG0gPSBncmFkaWVudChwcmVQLCBuZXhQKVxuICAgICAgICBkeDIgPSAobmV4UC54IC0gY3VyUC54KSAqIC1mXG4gICAgICAgIGR5MiA9IGR4MiAqIG0gKiB0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkeDIgPSAwXG4gICAgICAgIGR5MiA9IDBcbiAgICAgIH1cbiAgICAgIGN0eC5iZXppZXJDdXJ2ZVRvKHByZVAueCAtIGR4MSwgcHJlUC55IC0gZHkxLCBjdXJQLnggKyBkeDIsIGN1clAueSArIGR5MiwgY3VyUC54LCBjdXJQLnkpXG4gICAgICBkeDEgPSBkeDJcbiAgICAgIGR5MSA9IGR5MlxuICAgICAgcHJlUCA9IGN1clBcbiAgICB9XG4gICAgLy8gY3R4LnN0cm9rZSgpO1xuICB9XG4gIGJ6Q3VydmUocG9pbnRzLCAuMywgMSlcbiAgaWYoY29sb3IpIGN0eC5zdHJva2UoKVxufVxuXG5jb25zdCBhdmcgPSBhcnIgPT4gYXJyLnJlZHVjZSggKCBwLCBjICkgPT4gcCArIGMsIDAgKSAvIGFyci5sZW5ndGhcblxuXG5cbmV4cG9ydCBjb25zdCBkcmF3TGluZXMgPSAocHJvcHMsIGNhbnZhcywgeyByZW5kZXJlZExpbmVzLCBzZWxlY3RlZCwgcmVuZGVyTW9kZSB9KSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGlmKHJlbmRlck1vZGUgPT0gJ21pbm1heCcpIHtcbiAgICBmb3IobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgIGNvbnN0IGxpbmVzID0gcmVuZGVyZWRMaW5lc1twcm9wXVxuICAgICAgbGV0IG1pbkxpbmUgPSBbXVxuICAgICAgbGV0IG1heExpbmUgPSBbXVxuICAgICAgbGV0IGF2Z0xpbmUgPSBbXVxuXG4gICAgICBpZihsaW5lcyAmJiBsaW5lc1swXSAmJiBsaW5lc1swXS5sZW5ndGgpIHtcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGxpbmVzWzBdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbGV0IG1pbiA9IDk5OTk5OTk5XG4gICAgICAgICAgbGV0IG1heCA9IC05OTk5OTk5XG4gICAgICAgICAgbGV0IHhcbiAgICAgICAgICBsZXQgdmFsdWVzID0gW11cbiAgICAgICAgICBmb3IobGV0IGwgb2YgbGluZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBsW2ldXG4gICAgICAgICAgICB4ID0gcC54XG4gICAgICAgICAgICB2YWx1ZXMucHVzaChwLnkpXG4gICAgICAgICAgICBtaW4gPSBwLnkgPCBtaW4gPyBwLnkgOiBtaW5cbiAgICAgICAgICAgIG1heCA9IHAueSA+IG1heCA/IHAueSA6IG1heFxuICAgICAgICAgIH1cbiAgICAgICAgICBtaW5MaW5lLnB1c2goeyB4LCB5OiBtaW4gfSlcbiAgICAgICAgICBtYXhMaW5lLnB1c2goeyB4LCB5OiBtYXggfSlcbiAgICAgICAgICBhdmdMaW5lLnB1c2goeyB4LCB5OiBhdmcodmFsdWVzKSB9KVxuICAgICAgICB9XG4gICAgICAgIHNtb290aChjdHgsIGF2Z0xpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIDMpXG5cbiAgICAgICAgbWluTGluZS5yZXZlcnNlKClcblxuICAgICAgICBjb25zdCByZWdpb24gPSBuZXcgUGF0aDJEKClcbiAgICAgICAgY3R4Lm1vdmVUbyhtaW5MaW5lWzBdLngsIG1pbkxpbmVbMF0ueSlcbiAgICAgICAgc21vb3RoKHJlZ2lvbiwgbWluTGluZSlcbiAgICAgICAgcmVnaW9uLmxpbmVUbyhtYXhMaW5lWzBdLngsIG1heExpbmVbMF0ueSlcbiAgICAgICAgc21vb3RoKHJlZ2lvbiwgbWF4TGluZSlcbiAgICAgICAgcmVnaW9uLmNsb3NlUGF0aCgpXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBgJHtsaW5lQ29sb3JzW3Byb3BdfTMzYFxuICAgICAgICBjdHguZmlsbChyZWdpb24sICdub256ZXJvJylcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChsZXQgcHJvcCBvZiBwcm9wcykge1xuICAgICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBsaW5lID0gcmVuZGVyZWRMaW5lc1twcm9wXVtpXVxuICAgICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIGkgPT0gc2VsZWN0ZWQgPyAzIDogMSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwibGV0IG4gPSAwXG5cbi8vIHJhdGUgbGltaXRlZCBsb2dnaW5nXG5jb25zdCBsb2cgPSAoLi4uYXJncykgPT4ge1xuICBpZihuICUgNjAgPT0gMCkge1xuICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpXG4gICAgbiA9IDBcbiAgfVxufVxuXG5cbmV4cG9ydCBjb25zdCBnZXRJbnNwZWN0aW9uRGV0YWlscyA9IChtb2RlLCB6b25lcywgaW5zcGVjdFBvaW50LCByZW5kZXJlZCkgPT4ge1xuICBuICs9IDFcblxuICBjb25zdCBbIHRpbWUsIHkgXSA9IGluc3BlY3RQb2ludFxuXG4gIGxldCBkYXRhID0ge1xuICAgIHpvbmU6IC0xLFxuICAgIHBvaW50OiB7IHg6IC0xLCB5OiAtMSB9LFxuICAgIGluZGV4OiAtMSxcbiAgICBwb2ludEluZGV4OiAtMVxuICB9XG5cbiAgaWYobW9kZSAhPSAnaW5zcGVjdCcpIHJldHVybiBkYXRhXG5cbiAgbGV0IHNlbGVjdGVkRGlzdGFuY2VcblxuICBsZXQgc3RhbXBzID0gW11cblxuICBmb3IobGV0IFsgcHJvcGVydHksIGxpbmVzIF0gb2YgT2JqZWN0LmVudHJpZXMocmVuZGVyZWQpKSB7XG4gICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cbiAgICAgIC8vIGZpbmQgY2xvc2VzdCB4IHZhbHVlcyBvbiBlaXRoZXIgc2lkZSBvZiBpbnNwZWN0ZWQgeFxuICAgICAgaWYoIXN0YW1wc1swXSkge1xuICAgICAgICBsZXQgbWluR2FwID0gOTk5OTk5OTk5OTlcbiAgICAgICAgbGV0IGNsb3Nlc3RcbiAgICAgICAgZm9yKGxldCBwb2ludCBvZiBsaW5lKSB7XG4gICAgICAgICAgY29uc3QgeE9mZnNldCA9IE1hdGguYWJzKHBvaW50LnRpbWUgLSB0aW1lKVxuICAgICAgICAgIGlmKHhPZmZzZXQgPCBtaW5HYXApIHtcbiAgICAgICAgICAgIGNsb3Nlc3QgPSBwb2ludFxuICAgICAgICAgICAgbWluR2FwID0geE9mZnNldFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZHggPSBsaW5lLmluZGV4T2YoY2xvc2VzdClcbiAgICAgICAgZm9yKGxldCBvIG9mIFsgMSwgMiwgMywgNCBdKSB7XG4gICAgICAgICAgaWYoaWR4IC0gbyA+PSAwKSB7XG4gICAgICAgICAgICBzdGFtcHMucHVzaChsaW5lW2lkeCAtIG9dLngpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGlkeCArIG8gPD0gbGluZS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzdGFtcHMucHVzaChsaW5lW2lkeCArIG9dLngpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHN0YW1wcy5zb3J0KClcbiAgICAgIH1cblxuICAgICAgLy8gZmluZCBwb2ludHMgZm9yIHRoaXMgbGluZSB3aXRoIHggdmFsdWVzIG1hdGNoaW5nIHRoZSBzZXQgZGV0ZXJtaW5lZCBhYm92ZVxuICAgICAgY29uc3QgcG9pbnRzID0gc3RhbXBzLm1hcChzdGFtcCA9PiBsaW5lLmZpbmQocCA9PiBwLnggPT0gc3RhbXApKS5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgICAgIGlmKHBvaW50c1swXSkge1xuICAgICAgICAvLyBnZXQgbWluIGRpc3RhbmNlIGZyb20gcG9pbnRzL3NlZ21lbnRzIGFuZCBjbG9zZXN0IHBvaW50XG4gICAgICAgIGNvbnN0IHsgZGlzdGFuY2UsIGNsb3Nlc3QgfSA9IG1pbkRpc3RhbmNlKHBvaW50cywgeyB0aW1lLCB5IH0pXG5cbiAgICAgICAgaWYoZGlzdGFuY2UgPCBzZWxlY3RlZERpc3RhbmNlIHx8IHNlbGVjdGVkRGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGRhdGEuaW5kZXggPSBsaW5lcy5pbmRleE9mKGxpbmUpXG4gICAgICAgICAgZGF0YS56b25lID0gem9uZXNbZGF0YS5pbmRleF1cbiAgICAgICAgICBkYXRhLnBvaW50ID0gY2xvc2VzdFxuICAgICAgICAgIGRhdGEucG9pbnRJbmRleCA9IGxpbmUuaW5kZXhPZihjbG9zZXN0KVxuICAgICAgICAgIGRhdGEucHJvcGVydHkgPSBwcm9wZXJ0eVxuICAgICAgICAgIHNlbGVjdGVkRGlzdGFuY2UgPSBkaXN0YW5jZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGFcbn1cblxuXG4vLyBzaW1wbGUgZGlzdGFuY2UgY2FsY3VsYXRpb24gYmV0d2VlbiB0d28gcG9pbnRzXG5jb25zdCBnZXREaXN0YW5jZSA9IChwMSwgcDIpID0+IHtcbiAgY29uc3QgYSA9IHAxLnRpbWUgLSBwMi50aW1lXG4gIGNvbnN0IGIgPSBwMS55IC0gcDIueVxuICByZXR1cm4gTWF0aC5zcXJ0KGEgKiBhICsgYiAqIGIpXG59XG5cblxuLy8gZ2V0IHNob3J0ZXN0IGRpc3RhbmNlIGJldHdlZW4gYSBsaW5lIHNlZ21lbnQgYW5kIGEgcG9pbnRcbmZ1bmN0aW9uIGdldFNlZ21lbnREaXN0YW5jZShsMSwgbDIsIHApIHtcbiAgY29uc3QgeCA9IHAudGltZVxuICBjb25zdCB5ID0gcC55XG4gIGNvbnN0IHgxID0gbDEudGltZVxuICBjb25zdCB5MSA9IGwxLnlcbiAgY29uc3QgeDIgPSBsMi50aW1lXG4gIGNvbnN0IHkyID0gbDIueVxuXG4gIHZhciBBID0geCAtIHgxXG4gIHZhciBCID0geSAtIHkxXG4gIHZhciBDID0geDIgLSB4MVxuICB2YXIgRCA9IHkyIC0geTFcblxuICB2YXIgZG90ID0gQSAqIEMgKyBCICogRFxuICB2YXIgbGVuX3NxID0gQyAqIEMgKyBEICogRFxuICB2YXIgcGFyYW0gPSAtMVxuICBpZiAobGVuX3NxICE9IDApIC8vaW4gY2FzZSBvZiAwIGxlbmd0aCBsaW5lXG4gICAgcGFyYW0gPSBkb3QgLyBsZW5fc3FcblxuICB2YXIgeHgsIHl5XG5cbiAgaWYgKHBhcmFtIDwgMCkge1xuICAgIHh4ID0geDFcbiAgICB5eSA9IHkxXG4gIH1cbiAgZWxzZSBpZiAocGFyYW0gPiAxKSB7XG4gICAgeHggPSB4MlxuICAgIHl5ID0geTJcbiAgfVxuICBlbHNlIHtcbiAgICB4eCA9IHgxICsgcGFyYW0gKiBDXG4gICAgeXkgPSB5MSArIHBhcmFtICogRFxuICB9XG5cbiAgdmFyIGR4ID0geCAtIHh4XG4gIHZhciBkeSA9IHkgLSB5eVxuICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxufVxuXG4vLyBjYWxjdWxhdGUgZGlzdGFuY2Ugb2YgaW5zcGVjdGlvbiBwb2ludCBmcm9tIHBvaW50cyBhbmQvb3IgbGluZSBzZWdtZW50c1xuY29uc3QgbWluRGlzdGFuY2UgPSAocG9pbnRzLCB0YXJnZXQpID0+IHtcbiAgbGV0IGNsb3Nlc3RcbiAgbGV0IHBvaW50RGlzdGFuY2UgPSBudWxsXG4gIGxldCBsaW5lRGlzdGFuY2UgPSA5OTk5OTk5OTlcbiAgZm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldXG4gICAgY29uc3QgZCA9IGdldERpc3RhbmNlKHBvaW50LCB0YXJnZXQpXG4gICAgaWYocG9pbnREaXN0YW5jZSA9PT0gbnVsbCB8fCBkIDwgcG9pbnREaXN0YW5jZSkge1xuICAgICAgY2xvc2VzdCA9IHBvaW50XG4gICAgICBwb2ludERpc3RhbmNlID0gZFxuICAgIH1cbiAgICBpZihpID4gMCkge1xuICAgICAgbGluZURpc3RhbmNlID0gTWF0aC5taW4obGluZURpc3RhbmNlLCBnZXRTZWdtZW50RGlzdGFuY2UocG9pbnRzW2ldLCBwb2ludHNbaSAtIDFdLCB0YXJnZXQpKVxuICAgIH1cbiAgfVxuICByZXR1cm4geyBjbG9zZXN0LCBkaXN0YW5jZTogTWF0aC5taW4obGluZURpc3RhbmNlLCBwb2ludERpc3RhbmNlKSB9XG59XG4iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuaW1wb3J0IHsgZ2V0SW5zcGVjdGlvbkRldGFpbHMgfSBmcm9tICcuL2luc3BlY3Rpb24nXG5cblxuLyoqXG4gKiBHZW5lcmF0ZSBjYW52YXMgZnJhbWUgYmFzZWQgb24gY3VycmVudCBidWZmZXIvY29uZmlnXG4gKiBAcGFyYW0ge09iamVjdH0gY2hhcnREYXRhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsb2dTdGF0c1xuICogQHBhcmFtIHtGdW5jdGlvbn0gc3VibWl0TGluZXNcbiAqL1xuY29uc3QgZHJhdyA9IChjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcykgPT4ge1xuICBjb25zdCB7IGNhbnZhcywgY3R4LCBzY2FsZSwgcGF1c2VkLCBidWZmZXJQYXJhbXMsIHBvc2l0aW9uLCBtb2RlLCByZW5kZXJNb2RlLCBpbnNwZWN0ZWRQb2ludCB9ID0gY2hhcnREYXRhXG5cbiAgbGV0IHsgem9uZXMsIGphbmsgfSA9IGNoYXJ0RGF0YVxuXG4gIHpvbmVzID0gem9uZXMuZmlsdGVyKHggPT4gISF4KVxuXG4gIC8vIHJlbmRlciBtdWx0aXBsZSBjb3BpZXMgb2YgZWFjaCBsaW5lIGZvciBzdHJlc3MgdGVzdGluZ1xuICBpZihqYW5rKSB7XG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICAgIHpvbmVzID0gem9uZXMuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcylcbiAgfVxuXG4gIGNvbnN0IHsgcmF0ZSB9ID0gYnVmZmVyUGFyYW1zXG5cbiAgY29uc3QgX3Byb3BzID0gY2hhcnREYXRhLnByb3BlcnRpZXNcbiAgY29uc3QgcHJvcGVydGllcyA9IF9wcm9wcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgbGV0IG1heExpbmVQb2ludHMgPSBNYXRoLm1pbig3MDAsIE1hdGgubWF4KDgwLCAyMDAwMCAvICh6b25lcy5sZW5ndGggKiBwcm9wZXJ0aWVzLmxlbmd0aCkpKSAqIChjaGFydERhdGEucmVzb2x1dGlvbiAvIDQpXG5cbiAgY29uc3QgeyB4TWluLCB4TWF4LCBkWCwgeFNjYWxlLCB2YWxpZCwgeFJhbmdlLCBkZWxheSB9ID0gZ2V0WFBhcmFtZXRlcnMocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zKVxuICBpZighdmFsaWQpIHJldHVyblxuXG4gIGNvbnN0IHJlbmRlckxpbWl0ID0geE1pbiAtIGRlbGF5XG4gIGNvbnN0IHNhbXBsZSA9IGJ1ZmZlci5hY3RpdmUuZmlsdGVyKHggPT4geC50aW1lID49IHJlbmRlckxpbWl0KVxuXG4gIC8vIGRldGVybWluZSB3aGljaCBwb2ludHMgc2hvdWxkIGJlIGZpbHRlcmVkIGJhc2VkIG9uIG1heCBwb2ludHMgcGVyIGxpbmVcbiAgY29uc3QgbWluTVNJbnRlcnZhbCA9IGRYIC8gbWF4TGluZVBvaW50c1xuXG4gIGNvbnN0IHJlbmRlcmVkID0gc2FtcGxlLmZpbHRlcih4ID0+IHtcbiAgICBjb25zdCB2YWxpZFRpbWUgPSAoeC50aW1lIC0gMTYxNDc5OTE2MDAwMCkgJSBtaW5NU0ludGVydmFsIDwgMjAwMCAvIHJhdGVcbiAgICByZXR1cm4geCA9PSBzYW1wbGVbMF0gfHwgeCA9PSBzYW1wbGVbc2FtcGxlLmxlbmd0aCAtIDFdIHx8IHZhbGlkVGltZVxuICB9KVxuXG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIGxldCBtYXggPSB7fVxuICBsZXQgbWluID0ge31cbiAgbGV0IGF2ZyA9IHt9XG4gIGxldCBhdXRvU2NhbGUgPSB7fVxuICBsZXQgeVZhbHVlcyA9IHt9XG4gIGxldCB0b3RhbFBvaW50cyA9IDBcbiAgY29uc3Qgb2Zmc2V0WSA9IHBvc2l0aW9uLnBhbllcblxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgIGxpbmVzW3Byb3BdID0gW11cbiAgICBtYXhbcHJvcF0gPSAwXG4gICAgbWluW3Byb3BdID0gOTk5OTk5OTk5OTk5OTlcbiAgICB6b25lcy5mb3JFYWNoKHggPT4gbGluZXNbcHJvcF1beCAtIDFdID0gW10pXG5cblxuICAgIC8vIGNhbGN1bGF0ZSB4IHZhbHVlcyBpbiBwaXhlbHMsIGdhdGhlciB5IGF4aXMgZGF0YVxuICAgIGZvciAobGV0IGZyYW1lIG9mIHJlbmRlcmVkKSB7XG4gICAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgICBmb3IgKGxldCB6IG9mIHpvbmVzKSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gZnJhbWUuZGF0YVt6IC0gMV1cblxuICAgICAgICBsZXQgeSA9IHBvaW50W3Byb3BdXG4gICAgICAgIGlmIChwcm9wID09ICdkZXZpYXRpb24nKSB7XG4gICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncyhwb2ludClcbiAgICAgICAgICBpZiAoc2V0dGluZ3MubWFudWFsKSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQuYWN0dWFsX3BlcmNlbnQgLSBwb2ludC5tYW51YWxfc3BcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeSA9IHBvaW50LmFjdHVhbF90ZW1wIC0gcG9pbnQudGVtcF9zcFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsaW5lc1twcm9wXVt6IC0gMV0ucHVzaCh7IHgsIHksIHRpbWU6IGZyYW1lLnRzIH0pXG4gICAgICAgIG1heFtwcm9wXSA9IE1hdGgubWF4KG1heFtwcm9wXSwgeSlcbiAgICAgICAgbWluW3Byb3BdID0gTWF0aC5taW4obWluW3Byb3BdLCB5KVxuICAgICAgfVxuICAgIH1cblxuXG4gICAgY29uc3Qgc2NhbGVQYXJhbXMgPSBzY2FsZS55W3Byb3BdXG4gICAgY29uc3QgeyBtaW5ZLCBtYXhZIH0gPSBnZXRZUGFyYW1ldGVycyhwcm9wLCBtaW5bcHJvcF0sIG1heFtwcm9wXSwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKVxuXG4gICAgbWluW3Byb3BdID0gbWluWVxuICAgIG1heFtwcm9wXSA9IG1heFlcblxuICAgIC8vIGVzdGFibGlzaCBwaXhlbCB0byB1bml0IHJhdGlvXG4gICAgYXV0b1NjYWxlW3Byb3BdID0gY2FudmFzLmhlaWdodCAvIChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pXG5cblxuICAgIHJlbmRlcmVkTGluZXNbcHJvcF0gPSBbXVxuICAgIHlWYWx1ZXNbcHJvcF0gPSB7XG4gICAgICB0b3RhbDogMCxcbiAgICAgIHRvdGFsUG9pbnRzOiAwXG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHkgcGl4ZWwgdmFsdWVzIGJhc2VkIG9uIGVzdGFibGlzaGVkIHNjYWxlXG4gICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzW3Byb3BdLmZpbHRlcih4ID0+ICEheCkpIHtcbiAgICAgIGxldCByZW5kZXJlZExpbmUgPSBbXVxuXG4gICAgICBmb3IgKGxldCBwb2ludCBvZiBsaW5lKSB7XG4gICAgICAgIHlWYWx1ZXNbcHJvcF0udG90YWwgKz0gcG9pbnQueVxuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzICs9IDFcbiAgICAgICAgcG9pbnQueSA9IG9mZnNldFkgKyBwYXJzZUludChjYW52YXMuaGVpZ2h0IC0gKHBvaW50LnkgLSBtaW5bcHJvcF0pICogYXV0b1NjYWxlW3Byb3BdKVxuICAgICAgICByZW5kZXJlZExpbmUucHVzaChwb2ludClcbiAgICAgICAgdG90YWxQb2ludHMrK1xuICAgICAgfVxuXG4gICAgICByZW5kZXJlZExpbmVzW3Byb3BdLnB1c2gocmVuZGVyZWRMaW5lKVxuICAgIH1cblxuICAgIGF2Z1twcm9wXSA9IHlWYWx1ZXNbcHJvcF0udG90YWwgLyB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzXG5cbiAgICBpZih5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzID09IDApIHtcbiAgICAgIG1pbltwcm9wXSA9IDBcbiAgICAgIG1heFtwcm9wXSA9IDBcbiAgICB9XG4gIH1cblxuXG4gIGxldCBpbnNwZWN0aW9uRGV0YWlscyA9IGdldEluc3BlY3Rpb25EZXRhaWxzKG1vZGUsIHpvbmVzLCBpbnNwZWN0ZWRQb2ludCwgcmVuZGVyZWRMaW5lcylcbiAgaW5zcGVjdGlvbkRldGFpbHMuZnJhbWUgPSBnZXRGcmFtZShyZW5kZXJlZCwgaW5zcGVjdGlvbkRldGFpbHMucG9pbnRJbmRleCwgaW5zcGVjdGlvbkRldGFpbHMuem9uZSlcblxuICBjb25zdCBzZWxlY3RlZCA9IFsgaW5zcGVjdGlvbkRldGFpbHMuaW5kZXggXVxuXG4gIGlmKGNhbnZhcyAmJiBjdHgpIHtcbiAgICBkcmF3TGluZXMoX3Byb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQsIHJlbmRlck1vZGUgfSlcbiAgfSBlbHNlIHtcbiAgICBzdWJtaXRMaW5lcyh7IHJlbmRlcmVkTGluZXMsIHNlbGVjdGVkLCByZW5kZXJNb2RlIH0pXG4gIH1cblxuICBjb25zdCBwbG90RmlsbGVkID0gc2FtcGxlLmxlbmd0aCA8IGJ1ZmZlci5hY3RpdmUubGVuZ3RoXG5cbiAgbG9nU3RhdHMoeyB0b3RhbFBvaW50cywgbWF4LCBtaW4sIGF2ZywgcGxvdEZpbGxlZCwgaW5zcGVjdGlvbkRldGFpbHMsIHhNYXgsIHhNaW4gfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhd1xuXG5cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cbmNvbnN0IGdldEZyYW1lID0gKHJlbmRlcmVkLCBpZHgsIHpvbmUpID0+IHtcbiAgLy8gY29uc29sZS5sb2coaWR4LCB6b25lLCByZW5kZXJlZC5sZW5ndGgpXG4gIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaWR4XVxuICAvLyBjb25zb2xlLmxvZyhmcmFtZSlcbiAgaWYoIWZyYW1lKSByZXR1cm4ge31cbiAgcmV0dXJuIGZyYW1lLmRhdGFbem9uZSAtIDFdXG59XG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zKSA9PiB7XG4gIGNvbnN0IGxhdGVzdCA9IGJ1ZmZlci5hY3RpdmVbYnVmZmVyLmFjdGl2ZS5sZW5ndGggLSAxXVxuICBpZiAoIWxhdGVzdCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIDEwMDAgLyBidWZmZXJQYXJhbXMucmF0ZSkgKiAyXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheSAtIHRpbWVPZmZzZXRcbiAgbGV0IHJhd1hNYXggPSBwYXVzZWQgPyBsYXRlc3QudGltZSAtIGRlbGF5ICogLjI1IC0gdGltZU9mZnNldCA6IG5vd1xuICBsZXQgcmF3WE1pbiA9IHJhd1hNYXggLSB4UmFuZ2VcblxuICBsZXQgbWlkID0gcmF3WE1pbiArIHhSYW5nZSAvIDJcbiAgY29uc3Qgc2NhbGVkID0geFJhbmdlICogeFpvb21GYWN0b3IgLyAyXG5cbiAgY29uc3QgeE1heCA9IG1pZCArIHNjYWxlZFxuICBjb25zdCB4TWluID0gbWlkIC0gc2NhbGVkXG5cbiAgY29uc3QgZFggPSB4TWF4IC0geE1pblxuICBjb25zdCB4U2NhbGUgPSBjYW52YXMud2lkdGggLyAoeE1heCAtIHhNaW4pXG5cbiAgcmV0dXJuIHsgeE1pbiwgeE1heCwgeFJhbmdlLCBkWCwgeFNjYWxlLCBkZWxheSwgdmFsaWQ6IHRydWUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMClcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuICBjb25zdCBzY2FsZWRNaW4gPSBtaW5cbiAgY29uc3Qgc2NhbGVkTWF4ID0gbWF4XG5cbiAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICBjb25zdCBldmVuID0gaSA9PiB7XG4gICAgaWYgKG1pbkF1dG8pIG1pbiA9IC1pICsgaSAqIE1hdGguY2VpbChtaW4gLyBpKVxuICAgIGlmIChtYXhBdXRvKSBtYXggPSBpICsgaSAqIE1hdGguZmxvb3IobWF4IC8gaSlcbiAgfVxuXG5cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIGNvbnN0IG1heE9mZnNldCA9IHNjYWxlZE1heCAtIG1heCAvIChtYXggLSBtaW4pXG4gIGNvbnN0IG1pbk9mZnNldCA9IHNjYWxlZE1pbiAtIG1pbiAvIChtYXggLSBtaW4pXG5cbiAgcmV0dXJuIHsgbWluWTogbWluLCBtYXhZOiBtYXgsIG1heE9mZnNldCwgbWluT2Zmc2V0IH1cbn1cbiIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgfVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiBuZXcgRGF0ZSh1cGRhdGVkVFMpLCB0czogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2gobmV4dCksIDUwMClcbn1cblxuXG5cbmNvbnN0IHR5cGVTaXplcyA9IHtcbiAgXCJ1bmRlZmluZWRcIjogKCkgPT4gMCxcbiAgXCJib29sZWFuXCI6ICgpID0+IDQsXG4gIFwibnVtYmVyXCI6ICgpID0+IDgsXG4gIFwic3RyaW5nXCI6IGl0ZW0gPT4gMiAqIGl0ZW0ubGVuZ3RoLFxuICBcIm9iamVjdFwiOiBpdGVtID0+ICFpdGVtID8gMCA6IE9iamVjdFxuICAgIC5rZXlzKGl0ZW0pXG4gICAgLnJlZHVjZSgodG90YWwsIGtleSkgPT4gc2l6ZU9mKGtleSkgKyBzaXplT2YoaXRlbVtrZXldKSArIHRvdGFsLCAwKVxufVxuXG5jb25zdCBzaXplT2YgPSB2YWx1ZSA9PiB0eXBlU2l6ZXNbdHlwZW9mIHZhbHVlXSh2YWx1ZSlcbiIsImltcG9ydCByZW5kZXJMaW5lIGZyb20gJy4vbGluZS1wbG90J1xuaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IG1heENodW5rU2l6ZSB9IGZyb20gJy4uL3JlYWx0aW1lL2J1ZmZlcidcblxubGV0IHJlcXVlc3RBbmltRnJhbWVcbnRyeSB7XG4gIHJlcXVlc3RBbmltRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbn0gY2F0Y2goZSkge1xuICB0cnkge1xuICAgIHJlcXVlc3RBbmltRnJhbWUgPSB3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfSBjYXRjaChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb24gKi8gY2FsbGJhY2ssIC8qIERPTUVsZW1lbnQgKi8gZWxlbWVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxubGV0IHJlZnJlc2hSYXRlID0gNjBcblxuLy8gZ2V0IHJlZnJlc2ggcmF0ZSBmb3IgY3VycmVudCBkaXNwbGF5XG5jb25zdCBnZXRSZWZyZXNoUmF0ZSA9IGFzeW5jIChmcmFtZXMgPSA2MCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBsYXN0XG4gICAgY29uc3QgdGltZXMgPSBbXVxuICAgIGNvbnN0IGdldFRpbWUgPSBuID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICBpZihsYXN0KSB0aW1lcy5wdXNoKG5vdyAtIGxhc3QpXG4gICAgICBsYXN0ID0gbm93XG5cbiAgICAgIGlmKG4gPT0gMCkge1xuICAgICAgICBjb25zdCB0b3RhbCA9IHRpbWVzLnJlZHVjZSgodG90YWwsIHQpID0+IHRvdGFsICsgdCwgMClcbiAgICAgICAgY29uc3QgYXZnID0gdG90YWwgLyB0aW1lcy5sZW5ndGhcbiAgICAgICAgcmVzb2x2ZSgxMDAwIC8gYXZnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEFuaW1GcmFtZSgoKSA9PiBnZXRUaW1lKG4gLSAxKSlcbiAgICAgIH1cbiAgICB9XG4gICAgZ2V0VGltZShmcmFtZXMpXG4gIH0pXG59XG5cbmdldFJlZnJlc2hSYXRlKDEwMDApLnRoZW4ocmF0ZSA9PiB7XG4gIGlmKHJhdGUgPCA0MCkge1xuICAgIHJlZnJlc2hSYXRlID0gMzBcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhyZWZyZXNoUmF0ZSlcbn0pXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfSxcbiAgYnVmZmVyUGFyYW1zOiB7XG4gICAgcmF0ZTogMTBcbiAgfSxcbiAgLy8gY3VycmVudCBkYXRhcG9pbnQgZGVuc2l0eSBzZXR0aW5nICgxIC0gNClcbiAgcmVzb2x1dGlvbjogNFxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuLy8gbW9zdCByZWNlbnQgc2V0IG9mIHJlbmRlciB0aW1lcyAodG8gZGV0ZXJtaW5lIGZyYW1lIHJhdGUpXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG4vLyBmcmFtZXJhdGUgc25hcHNob3RzIHRvIG1vbml0b3Igc3lzdGVtIHN0cmFpblxubGV0IHBlcmZvcm1hbmNlSGlzdG9yeSA9IFtdXG5cbi8vIHRyYWNrIG1vc3QgcmVjZW50IFxubGV0IGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuLy8gdHJhY2sgbnVtYmVyIG9mIHRpbWVzIG1heCBSZXNvbHV0aW9uIHJlY29tbWVuZGVkXG5sZXQgbWF4UmVzQ291bnQgPSAwXG5cblxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3NjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiwgb2Zmc2V0czogc3RhdHMub2Zmc2V0cywgaW5zcGVjdGlvbjogc3RhdHMuaW5zcGVjdGlvbkRldGFpbHMgfX0pXG4gICAgcmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXShjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcylcbiAgICByZW5kZXJUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbGFzdClcbiAgfVxuICBsYXN0ID0gdFxuICByZXF1ZXN0QW5pbUZyYW1lKGRyYXcpXG59XG5cbnJlcXVlc3RBbmltRnJhbWUoZHJhdylcblxuY29uc3Qgc3VibWl0TGluZXMgPSBsaW5lcyA9PiB7XG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ2xpbmVzJywgbGluZXMgfSlcbn1cblxuY29uc3QgY29sbGVjdFN0YXRzID0gKCkgPT4ge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLmNlaWwoMTAwMCAvIGF2Z1JlbmRlcilcbiAgcGVyZm9ybWFuY2VIaXN0b3J5LnB1c2goZnJhbWVyYXRlKVxuXG4gIC8vIGtlZXAgbGFzdCAxMHMgb2YgZnJhbWVyYXRlIGRhdGEgZm9yIHBlcmZvcm1hbmNlIG1vbml0b3JpbmdcbiAgcGVyZm9ybWFuY2VIaXN0b3J5ID0gcGVyZm9ybWFuY2VIaXN0b3J5LnNsaWNlKC0zMClcblxuICAvLyB0cnVuY2F0ZSBmcmFtZSBkYXRhIHRvIGtlZXAgYSByb2xsaW5nIGF2ZXJhZ2VcbiAgcmVuZGVyVGltZXMgPSByZW5kZXJUaW1lcy5zbGljZSgtNjApXG5cbiAgLy8gaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCwgY2FsY3VsYXRlIHJlY29tbWVuZGVkIHJlc29sdXRpb25cbiAgaWYobm93IC0gbGFzdFJlc29sdXRpb25DaGFuZ2UgPiAxMDAwKSB7XG4gICAgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBub3dcblxuICAgIGNvbnN0IHJlY29tbWVuZGVkID0gTWF0aC5jZWlsKChmcmFtZXJhdGUgLSAxNSkgKiA0IC8gKHJlZnJlc2hSYXRlIC0gMTUpKVxuXG4gICAgaWYocmVjb21tZW5kZWQgPiAzICYmIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID09IDMpIHtcbiAgICAgIGlmKG1heFJlc0NvdW50ID4gMykge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IDRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heFJlc0NvdW50ICs9IDFcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWF4UmVzQ291bnQgPSAwXG5cbiAgICAgIC8vIGVuc3VyZSB3ZSdyZSBhaW1pbmcgZm9yIHJlY29tbWVuZGVkICsvLSAxXG4gICAgICBpZiAocmVjb21tZW5kZWQgLSAxID4gY2hhcnREYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gKz0gMVxuICAgICAgfSBlbHNlIGlmIChyZWNvbW1lbmRlZCArIDEgPCBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiAtPSAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY2xhbXAgYXQgMSAtIDRcbiAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IE1hdGgubWF4KDEsIE1hdGgubWluKGNoYXJ0RGF0YS5yZXNvbHV0aW9uLCA0KSlcblxuICAgIHN0YXRzLnJlc29sdXRpb24gPSBjaGFydERhdGEucmVzb2x1dGlvblxuICB9XG5cbiAgc3RhdHMgPSB7IC4uLnN0YXRzLCBmcmFtZXJhdGUgfVxuICBjaGFydERhdGEuZnJhbWVyYXRlID0gZnJhbWVyYXRlXG5cbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RhdHMnLCB2YWx1ZTogc3RhdHMgfSlcbn1cblxuc2V0SW50ZXJ2YWwoY29sbGVjdFN0YXRzLCAxMDAwIC8gMylcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMgJiYgZS5kYXRhLmNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwicmVuZGVyTGluZSIsImRyYXciXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUksTUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7RUFDQSxNQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQzlCO0VBQ0EsRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQy9FLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNoRCxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksTUFBTSxDQUFD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Q0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztFQUMzRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFDO0VBQzNELEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLGFBQVk7QUFDL0I7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFVO0VBQ3JDLEVBQUUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztBQUM1QztFQUNBLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBQztBQUMxSDtFQUNBLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFDO0VBQ3hILEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNO0FBQ25CO0VBQ0EsRUFBRSxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsTUFBSztFQUNsQyxFQUFFLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBQztBQUNqRTtFQUNBO0VBQ0EsRUFBRSxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsY0FBYTtBQUMxQztFQUNBLEVBQUUsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUk7RUFDdEMsSUFBSSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsYUFBYSxJQUFJLGFBQWEsR0FBRyxJQUFJLEdBQUcsS0FBSTtFQUM1RSxJQUFJLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksU0FBUztFQUN4RSxHQUFHLEVBQUM7QUFDSjtBQUNBO0VBQ0E7QUFDQTtFQUNBLEVBQUUsSUFBSSxLQUFLLEdBQUcsR0FBRTtFQUNoQixFQUFFLElBQUksYUFBYSxHQUFHLEdBQUU7QUFDeEI7RUFDQSxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksR0FBRyxHQUFHLEdBQUU7RUFDZCxFQUFFLElBQUksU0FBUyxHQUFHLEdBQUU7RUFDcEIsRUFBRSxJQUFJLE9BQU8sR0FBRyxHQUFFO0VBQ2xCLEVBQUUsSUFBSSxXQUFXLEdBQUcsRUFBQztFQUNyQixFQUFFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFJO0FBQy9CO0FBQ0E7RUFDQSxFQUFFLEtBQUssSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0VBQy9CLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUU7RUFDcEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztFQUNqQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFjO0VBQzlCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUM7QUFDL0M7QUFDQTtFQUNBO0VBQ0EsSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLFFBQVEsRUFBRTtFQUNoQyxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksT0FBTTtBQUM1QztFQUNBLE1BQU0sS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUU7RUFDM0IsUUFBUSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUM7QUFDdkM7RUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUM7RUFDM0IsUUFBUSxJQUFJLElBQUksSUFBSSxXQUFXLEVBQUU7RUFDakMsVUFBVSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFDO0VBQzdDLFVBRWlCO0VBQ2pCLFlBQVksQ0FBQyxHQUFHLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFFBQU87RUFDakQsV0FBVztFQUNYLFNBQVM7RUFDVCxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFDO0VBQ3pELFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQztFQUMxQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDMUMsT0FBTztFQUNQLEtBQUs7QUFDTDtBQUNBO0VBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNyQyxJQUFJLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxD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
