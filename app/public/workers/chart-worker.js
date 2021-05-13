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

    if(color) ctx.beginPath();
    if (points == undefined || points.length == 0 || points.length < 3) {
      return true
    }

    function gradient(a, b) {
      return (b.y - a.y) / (b.x - a.x)
    }

    function bzCurve(points, f = .5, t = 1) {
      //f = 0, will be straight line
      //t should generally be 1, but changing the value can control the smoothness too

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

        // draw points for debugging

        // if(color) {
        //   ctx.fillStyle = color
        //   ctx.fillRect(curP.x - 4, curP.y - 4, 8, 8)
        // }

        const nexP = points[i + 1];
        if (nexP) {
          // flatten curves next to level y segments to avoid "horns" where the plot plateaus
          const modifier = nexP.y == curP.y || dy1 == 0 ? .05 : 1;

          m = gradient(preP, nexP);
          dx2 = (nexP.x - curP.x) * -f * (dy1 == 0 ? .8 : 1);
          dy2 = dx2 * m * t * modifier;
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
    bzCurve(points);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvaW5zcGVjdGlvbi5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2xpbmUtcGxvdC5qcyIsIi4uLy4uL3NyYy9kYXRhL3JlYWx0aW1lL2J1ZmZlci5qcyIsIi4uLy4uL3NyYy9kYXRhL2NoYXJ0aW5nL2NoYXJ0LXdvcmtlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgYnVmZmVyID0ge1xuICBlbnRyaWVzOiBbXSxcbiAgYWN0aXZlOiBbXSxcbiAgcGF1c2VkOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZycsIGRhdGEpXG4gIGJ1ZmZlci5lbnRyaWVzID0gWyAuLi5idWZmZXIuZW50cmllcywgLi4uZGF0YSBdLmZpbHRlcih4ID0+ICEheCkuc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiZXhwb3J0IGNvbnN0IGNvbG9ycyA9IHtcbiAgMTogJyNBMTAzRkYnLFxuICAyOiAnI0ZGOUMwMycsXG4gIDM6ICcjMDNDRkZGJyxcbiAgNDogJyMyRTAzRkYnXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNtb290aChjdHgsIHBvaW50cywgY29sb3IsIHdpZHRoICkge1xuICBjdHguc3Ryb2tlU3R5bGUgPSBjb2xvclxuICBjdHgubGluZVdpZHRoID0gd2lkdGhcblxuICBpZihjb2xvcikgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCB8fCBwb2ludHMubGVuZ3RoIDwgMykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBncmFkaWVudChhLCBiKSB7XG4gICAgcmV0dXJuIChiLnkgLSBhLnkpIC8gKGIueCAtIGEueClcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ6Q3VydmUocG9pbnRzLCBmID0gLjUsIHQgPSAxKSB7XG4gICAgLy9mID0gMCwgd2lsbCBiZSBzdHJhaWdodCBsaW5lXG4gICAgLy90IHNob3VsZCBnZW5lcmFsbHkgYmUgMSwgYnV0IGNoYW5naW5nIHRoZSB2YWx1ZSBjYW4gY29udHJvbCB0aGUgc21vb3RobmVzcyB0b29cblxuICAgIGlmKGNvbG9yKSBjdHguYmVnaW5QYXRoKClcbiAgICBpZihjb2xvcikgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG5cbiAgICB2YXIgbSA9IDBcbiAgICB2YXIgZHgxID0gMFxuICAgIHZhciBkeTEgPSAwXG4gICAgbGV0IGR4MiA9IDBcbiAgICBsZXQgZHkyID0gMFxuXG4gICAgdmFyIHByZVAgPSBwb2ludHNbMF1cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGN1clAgPSBwb2ludHNbaV1cblxuICAgICAgLy8gZHJhdyBwb2ludHMgZm9yIGRlYnVnZ2luZ1xuXG4gICAgICAvLyBpZihjb2xvcikge1xuICAgICAgLy8gICBjdHguZmlsbFN0eWxlID0gY29sb3JcbiAgICAgIC8vICAgY3R4LmZpbGxSZWN0KGN1clAueCAtIDQsIGN1clAueSAtIDQsIDgsIDgpXG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IG5leFAgPSBwb2ludHNbaSArIDFdXG4gICAgICBpZiAobmV4UCkge1xuICAgICAgICAvLyBmbGF0dGVuIGN1cnZlcyBuZXh0IHRvIGxldmVsIHkgc2VnbWVudHMgdG8gYXZvaWQgXCJob3Juc1wiIHdoZXJlIHRoZSBwbG90IHBsYXRlYXVzXG4gICAgICAgIGNvbnN0IG1vZGlmaWVyID0gbmV4UC55ID09IGN1clAueSB8fCBkeTEgPT0gMCA/IC4wNSA6IDFcblxuICAgICAgICBtID0gZ3JhZGllbnQocHJlUCwgbmV4UClcbiAgICAgICAgZHgyID0gKG5leFAueCAtIGN1clAueCkgKiAtZiAqIChkeTEgPT0gMCA/IC44IDogMSlcbiAgICAgICAgZHkyID0gZHgyICogbSAqIHQgKiBtb2RpZmllclxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZHgyID0gMFxuICAgICAgICBkeTIgPSAwXG4gICAgICB9XG4gICAgICBjdHguYmV6aWVyQ3VydmVUbyhwcmVQLnggLSBkeDEsIHByZVAueSAtIGR5MSwgY3VyUC54ICsgZHgyLCBjdXJQLnkgKyBkeTIsIGN1clAueCwgY3VyUC55KVxuICAgICAgZHgxID0gZHgyXG4gICAgICBkeTEgPSBkeTJcbiAgICAgIHByZVAgPSBjdXJQXG4gICAgfVxuICAgIC8vIGN0eC5zdHJva2UoKTtcbiAgfVxuICBiekN1cnZlKHBvaW50cylcbiAgaWYoY29sb3IpIGN0eC5zdHJva2UoKVxufVxuXG5jb25zdCBhdmcgPSBhcnIgPT4gYXJyLnJlZHVjZSggKCBwLCBjICkgPT4gcCArIGMsIDAgKSAvIGFyci5sZW5ndGhcblxuXG5cbmV4cG9ydCBjb25zdCBkcmF3TGluZXMgPSAocHJvcHMsIGNhbnZhcywgeyByZW5kZXJlZExpbmVzLCBzZWxlY3RlZCwgcmVuZGVyTW9kZSB9KSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbcHJvcHNbMF1dOiBjb2xvcnNbMV0sXG4gICAgW3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtwcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbcHJvcHNbM11dOiBjb2xvcnNbNF1cbiAgfVxuXG4gIC8vIGNsZWFyIGNhbnZhcyBmb3IgbmV3IGZyYW1lXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGlmKHJlbmRlck1vZGUgPT0gJ21pbm1heCcpIHtcbiAgICBmb3IobGV0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgIGNvbnN0IGxpbmVzID0gcmVuZGVyZWRMaW5lc1twcm9wXVxuICAgICAgbGV0IG1pbkxpbmUgPSBbXVxuICAgICAgbGV0IG1heExpbmUgPSBbXVxuICAgICAgbGV0IGF2Z0xpbmUgPSBbXVxuXG4gICAgICBpZihsaW5lcyAmJiBsaW5lc1swXSAmJiBsaW5lc1swXS5sZW5ndGgpIHtcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGxpbmVzWzBdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbGV0IG1pbiA9IDk5OTk5OTk5XG4gICAgICAgICAgbGV0IG1heCA9IC05OTk5OTk5XG4gICAgICAgICAgbGV0IHhcbiAgICAgICAgICBsZXQgdmFsdWVzID0gW11cbiAgICAgICAgICBmb3IobGV0IGwgb2YgbGluZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBsW2ldXG4gICAgICAgICAgICB4ID0gcC54XG4gICAgICAgICAgICB2YWx1ZXMucHVzaChwLnkpXG4gICAgICAgICAgICBtaW4gPSBwLnkgPCBtaW4gPyBwLnkgOiBtaW5cbiAgICAgICAgICAgIG1heCA9IHAueSA+IG1heCA/IHAueSA6IG1heFxuICAgICAgICAgIH1cbiAgICAgICAgICBtaW5MaW5lLnB1c2goeyB4LCB5OiBtaW4gfSlcbiAgICAgICAgICBtYXhMaW5lLnB1c2goeyB4LCB5OiBtYXggfSlcbiAgICAgICAgICBhdmdMaW5lLnB1c2goeyB4LCB5OiBhdmcodmFsdWVzKSB9KVxuICAgICAgICB9XG4gICAgICAgIHNtb290aChjdHgsIGF2Z0xpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIDMpXG5cbiAgICAgICAgbWluTGluZS5yZXZlcnNlKClcblxuICAgICAgICBjb25zdCByZWdpb24gPSBuZXcgUGF0aDJEKClcbiAgICAgICAgY3R4Lm1vdmVUbyhtaW5MaW5lWzBdLngsIG1pbkxpbmVbMF0ueSlcbiAgICAgICAgc21vb3RoKHJlZ2lvbiwgbWluTGluZSlcbiAgICAgICAgcmVnaW9uLmxpbmVUbyhtYXhMaW5lWzBdLngsIG1heExpbmVbMF0ueSlcbiAgICAgICAgc21vb3RoKHJlZ2lvbiwgbWF4TGluZSlcbiAgICAgICAgcmVnaW9uLmNsb3NlUGF0aCgpXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBgJHtsaW5lQ29sb3JzW3Byb3BdfTMzYFxuICAgICAgICBjdHguZmlsbChyZWdpb24sICdub256ZXJvJylcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChsZXQgcHJvcCBvZiBwcm9wcykge1xuICAgICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkTGluZXNbcHJvcF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBsaW5lID0gcmVuZGVyZWRMaW5lc1twcm9wXVtpXVxuICAgICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIGkgPT0gc2VsZWN0ZWQgPyAzIDogMSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwibGV0IG4gPSAwXG5cbi8vIHJhdGUgbGltaXRlZCBsb2dnaW5nXG5jb25zdCBsb2cgPSAoLi4uYXJncykgPT4ge1xuICBpZihuICUgNjAgPT0gMCkge1xuICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpXG4gICAgbiA9IDBcbiAgfVxufVxuXG5cbmV4cG9ydCBjb25zdCBnZXRJbnNwZWN0aW9uRGV0YWlscyA9IChtb2RlLCB6b25lcywgaW5zcGVjdFBvaW50LCByZW5kZXJlZCkgPT4ge1xuICBuICs9IDFcblxuICBjb25zdCBbIHRpbWUsIHkgXSA9IGluc3BlY3RQb2ludFxuXG4gIGxldCBkYXRhID0ge1xuICAgIHpvbmU6IC0xLFxuICAgIHBvaW50OiB7IHg6IC0xLCB5OiAtMSB9LFxuICAgIGluZGV4OiAtMSxcbiAgICBwb2ludEluZGV4OiAtMVxuICB9XG5cbiAgaWYobW9kZSAhPSAnaW5zcGVjdCcpIHJldHVybiBkYXRhXG5cbiAgbGV0IHNlbGVjdGVkRGlzdGFuY2VcblxuICBsZXQgc3RhbXBzID0gW11cblxuICBmb3IobGV0IFsgcHJvcGVydHksIGxpbmVzIF0gb2YgT2JqZWN0LmVudHJpZXMocmVuZGVyZWQpKSB7XG4gICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cbiAgICAgIC8vIGZpbmQgY2xvc2VzdCB4IHZhbHVlcyBvbiBlaXRoZXIgc2lkZSBvZiBpbnNwZWN0ZWQgeFxuICAgICAgaWYoIXN0YW1wc1swXSkge1xuICAgICAgICBsZXQgbWluR2FwID0gOTk5OTk5OTk5OTlcbiAgICAgICAgbGV0IGNsb3Nlc3RcbiAgICAgICAgZm9yKGxldCBwb2ludCBvZiBsaW5lKSB7XG4gICAgICAgICAgY29uc3QgeE9mZnNldCA9IE1hdGguYWJzKHBvaW50LnRpbWUgLSB0aW1lKVxuICAgICAgICAgIGlmKHhPZmZzZXQgPCBtaW5HYXApIHtcbiAgICAgICAgICAgIGNsb3Nlc3QgPSBwb2ludFxuICAgICAgICAgICAgbWluR2FwID0geE9mZnNldFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZHggPSBsaW5lLmluZGV4T2YoY2xvc2VzdClcbiAgICAgICAgZm9yKGxldCBvIG9mIFsgMSwgMiwgMywgNCBdKSB7XG4gICAgICAgICAgaWYoaWR4IC0gbyA+PSAwKSB7XG4gICAgICAgICAgICBzdGFtcHMucHVzaChsaW5lW2lkeCAtIG9dLngpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKGlkeCArIG8gPD0gbGluZS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzdGFtcHMucHVzaChsaW5lW2lkeCArIG9dLngpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHN0YW1wcy5zb3J0KClcbiAgICAgIH1cblxuICAgICAgLy8gZmluZCBwb2ludHMgZm9yIHRoaXMgbGluZSB3aXRoIHggdmFsdWVzIG1hdGNoaW5nIHRoZSBzZXQgZGV0ZXJtaW5lZCBhYm92ZVxuICAgICAgY29uc3QgcG9pbnRzID0gc3RhbXBzLm1hcChzdGFtcCA9PiBsaW5lLmZpbmQocCA9PiBwLnggPT0gc3RhbXApKS5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgICAgIGlmKHBvaW50c1swXSkge1xuICAgICAgICAvLyBnZXQgbWluIGRpc3RhbmNlIGZyb20gcG9pbnRzL3NlZ21lbnRzIGFuZCBjbG9zZXN0IHBvaW50XG4gICAgICAgIGNvbnN0IHsgZGlzdGFuY2UsIGNsb3Nlc3QgfSA9IG1pbkRpc3RhbmNlKHBvaW50cywgeyB0aW1lLCB5IH0pXG5cbiAgICAgICAgaWYoZGlzdGFuY2UgPCBzZWxlY3RlZERpc3RhbmNlIHx8IHNlbGVjdGVkRGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGRhdGEuaW5kZXggPSBsaW5lcy5pbmRleE9mKGxpbmUpXG4gICAgICAgICAgZGF0YS56b25lID0gem9uZXNbZGF0YS5pbmRleF1cbiAgICAgICAgICBkYXRhLnBvaW50ID0gY2xvc2VzdFxuICAgICAgICAgIGRhdGEucG9pbnRJbmRleCA9IGxpbmUuaW5kZXhPZihjbG9zZXN0KVxuICAgICAgICAgIGRhdGEucHJvcGVydHkgPSBwcm9wZXJ0eVxuICAgICAgICAgIHNlbGVjdGVkRGlzdGFuY2UgPSBkaXN0YW5jZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGFcbn1cblxuXG4vLyBzaW1wbGUgZGlzdGFuY2UgY2FsY3VsYXRpb24gYmV0d2VlbiB0d28gcG9pbnRzXG5jb25zdCBnZXREaXN0YW5jZSA9IChwMSwgcDIpID0+IHtcbiAgY29uc3QgYSA9IHAxLnRpbWUgLSBwMi50aW1lXG4gIGNvbnN0IGIgPSBwMS55IC0gcDIueVxuICByZXR1cm4gTWF0aC5zcXJ0KGEgKiBhICsgYiAqIGIpXG59XG5cblxuLy8gZ2V0IHNob3J0ZXN0IGRpc3RhbmNlIGJldHdlZW4gYSBsaW5lIHNlZ21lbnQgYW5kIGEgcG9pbnRcbmZ1bmN0aW9uIGdldFNlZ21lbnREaXN0YW5jZShsMSwgbDIsIHApIHtcbiAgY29uc3QgeCA9IHAudGltZVxuICBjb25zdCB5ID0gcC55XG4gIGNvbnN0IHgxID0gbDEudGltZVxuICBjb25zdCB5MSA9IGwxLnlcbiAgY29uc3QgeDIgPSBsMi50aW1lXG4gIGNvbnN0IHkyID0gbDIueVxuXG4gIHZhciBBID0geCAtIHgxXG4gIHZhciBCID0geSAtIHkxXG4gIHZhciBDID0geDIgLSB4MVxuICB2YXIgRCA9IHkyIC0geTFcblxuICB2YXIgZG90ID0gQSAqIEMgKyBCICogRFxuICB2YXIgbGVuX3NxID0gQyAqIEMgKyBEICogRFxuICB2YXIgcGFyYW0gPSAtMVxuICBpZiAobGVuX3NxICE9IDApIC8vaW4gY2FzZSBvZiAwIGxlbmd0aCBsaW5lXG4gICAgcGFyYW0gPSBkb3QgLyBsZW5fc3FcblxuICB2YXIgeHgsIHl5XG5cbiAgaWYgKHBhcmFtIDwgMCkge1xuICAgIHh4ID0geDFcbiAgICB5eSA9IHkxXG4gIH1cbiAgZWxzZSBpZiAocGFyYW0gPiAxKSB7XG4gICAgeHggPSB4MlxuICAgIHl5ID0geTJcbiAgfVxuICBlbHNlIHtcbiAgICB4eCA9IHgxICsgcGFyYW0gKiBDXG4gICAgeXkgPSB5MSArIHBhcmFtICogRFxuICB9XG5cbiAgdmFyIGR4ID0geCAtIHh4XG4gIHZhciBkeSA9IHkgLSB5eVxuICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxufVxuXG4vLyBjYWxjdWxhdGUgZGlzdGFuY2Ugb2YgaW5zcGVjdGlvbiBwb2ludCBmcm9tIHBvaW50cyBhbmQvb3IgbGluZSBzZWdtZW50c1xuY29uc3QgbWluRGlzdGFuY2UgPSAocG9pbnRzLCB0YXJnZXQpID0+IHtcbiAgbGV0IGNsb3Nlc3RcbiAgbGV0IHBvaW50RGlzdGFuY2UgPSBudWxsXG4gIGxldCBsaW5lRGlzdGFuY2UgPSA5OTk5OTk5OTlcbiAgZm9yKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldXG4gICAgY29uc3QgZCA9IGdldERpc3RhbmNlKHBvaW50LCB0YXJnZXQpXG4gICAgaWYocG9pbnREaXN0YW5jZSA9PT0gbnVsbCB8fCBkIDwgcG9pbnREaXN0YW5jZSkge1xuICAgICAgY2xvc2VzdCA9IHBvaW50XG4gICAgICBwb2ludERpc3RhbmNlID0gZFxuICAgIH1cbiAgICBpZihpID4gMCkge1xuICAgICAgbGluZURpc3RhbmNlID0gTWF0aC5taW4obGluZURpc3RhbmNlLCBnZXRTZWdtZW50RGlzdGFuY2UocG9pbnRzW2ldLCBwb2ludHNbaSAtIDFdLCB0YXJnZXQpKVxuICAgIH1cbiAgfVxuICByZXR1cm4geyBjbG9zZXN0LCBkaXN0YW5jZTogTWF0aC5taW4obGluZURpc3RhbmNlLCBwb2ludERpc3RhbmNlKSB9XG59XG4iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgZHJhd0xpbmVzIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuaW1wb3J0IHsgZ2V0SW5zcGVjdGlvbkRldGFpbHMgfSBmcm9tICcuL2luc3BlY3Rpb24nXG5cblxuLyoqXG4gKiBHZW5lcmF0ZSBjYW52YXMgZnJhbWUgYmFzZWQgb24gY3VycmVudCBidWZmZXIvY29uZmlnXG4gKiBAcGFyYW0ge09iamVjdH0gY2hhcnREYXRhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsb2dTdGF0c1xuICogQHBhcmFtIHtGdW5jdGlvbn0gc3VibWl0TGluZXNcbiAqL1xuY29uc3QgZHJhdyA9IChjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcykgPT4ge1xuICBjb25zdCB7IGNhbnZhcywgY3R4LCBzY2FsZSwgcGF1c2VkLCBidWZmZXJQYXJhbXMsIHBvc2l0aW9uLCBtb2RlLCByZW5kZXJNb2RlLCBpbnNwZWN0ZWRQb2ludCB9ID0gY2hhcnREYXRhXG5cbiAgbGV0IHsgem9uZXMsIGphbmsgfSA9IGNoYXJ0RGF0YVxuXG4gIHpvbmVzID0gem9uZXMuZmlsdGVyKHggPT4gISF4KVxuXG4gIC8vIHJlbmRlciBtdWx0aXBsZSBjb3BpZXMgb2YgZWFjaCBsaW5lIGZvciBzdHJlc3MgdGVzdGluZ1xuICBpZihqYW5rKSB7XG4gICAgem9uZXMgPSB6b25lcy5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcykuY29uY2F0KHpvbmVzKVxuICAgIHpvbmVzID0gem9uZXMuY29uY2F0KHpvbmVzKS5jb25jYXQoem9uZXMpLmNvbmNhdCh6b25lcylcbiAgfVxuXG4gIGNvbnN0IHsgcmF0ZSB9ID0gYnVmZmVyUGFyYW1zXG5cbiAgY29uc3QgX3Byb3BzID0gY2hhcnREYXRhLnByb3BlcnRpZXNcbiAgY29uc3QgcHJvcGVydGllcyA9IF9wcm9wcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgbGV0IG1heExpbmVQb2ludHMgPSBNYXRoLm1pbig3MDAsIE1hdGgubWF4KDgwLCAyMDAwMCAvICh6b25lcy5sZW5ndGggKiBwcm9wZXJ0aWVzLmxlbmd0aCkpKSAqIChjaGFydERhdGEucmVzb2x1dGlvbiAvIDQpXG5cbiAgY29uc3QgeyB4TWluLCB4TWF4LCBkWCwgeFNjYWxlLCB2YWxpZCwgeFJhbmdlLCBkZWxheSB9ID0gZ2V0WFBhcmFtZXRlcnMocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zKVxuICBpZighdmFsaWQpIHJldHVyblxuXG4gIGNvbnN0IHJlbmRlckxpbWl0ID0geE1pbiAtIGRlbGF5XG4gIGNvbnN0IHNhbXBsZSA9IGJ1ZmZlci5hY3RpdmUuZmlsdGVyKHggPT4geC50aW1lID49IHJlbmRlckxpbWl0KVxuXG4gIC8vIGRldGVybWluZSB3aGljaCBwb2ludHMgc2hvdWxkIGJlIGZpbHRlcmVkIGJhc2VkIG9uIG1heCBwb2ludHMgcGVyIGxpbmVcbiAgY29uc3QgbWluTVNJbnRlcnZhbCA9IGRYIC8gbWF4TGluZVBvaW50c1xuXG4gIGNvbnN0IHJlbmRlcmVkID0gc2FtcGxlLmZpbHRlcih4ID0+IHtcbiAgICBjb25zdCB2YWxpZFRpbWUgPSAoeC50aW1lIC0gMTYxNDc5OTE2MDAwMCkgJSBtaW5NU0ludGVydmFsIDwgMjAwMCAvIHJhdGVcbiAgICByZXR1cm4geCA9PSBzYW1wbGVbMF0gfHwgeCA9PSBzYW1wbGVbc2FtcGxlLmxlbmd0aCAtIDFdIHx8IHZhbGlkVGltZVxuICB9KVxuXG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIGxldCBtYXggPSB7fVxuICBsZXQgbWluID0ge31cbiAgbGV0IGF2ZyA9IHt9XG4gIGxldCBhdXRvU2NhbGUgPSB7fVxuICBsZXQgeVZhbHVlcyA9IHt9XG4gIGxldCB0b3RhbFBvaW50cyA9IDBcbiAgY29uc3Qgb2Zmc2V0WSA9IHBvc2l0aW9uLnBhbllcblxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgIGxpbmVzW3Byb3BdID0gW11cbiAgICBtYXhbcHJvcF0gPSAwXG4gICAgbWluW3Byb3BdID0gOTk5OTk5OTk5OTk5OTlcbiAgICB6b25lcy5mb3JFYWNoKHggPT4gbGluZXNbcHJvcF1beCAtIDFdID0gW10pXG5cblxuICAgIC8vIGNhbGN1bGF0ZSB4IHZhbHVlcyBpbiBwaXhlbHMsIGdhdGhlciB5IGF4aXMgZGF0YVxuICAgIGZvciAobGV0IGZyYW1lIG9mIHJlbmRlcmVkKSB7XG4gICAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgICBmb3IgKGxldCB6IG9mIHpvbmVzKSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gZnJhbWUuZGF0YVt6IC0gMV1cblxuICAgICAgICBsZXQgeSA9IHBvaW50W3Byb3BdXG4gICAgICAgIGlmIChwcm9wID09ICdkZXZpYXRpb24nKSB7XG4gICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBnZXRTZXR0aW5ncyhwb2ludClcbiAgICAgICAgICBpZiAoc2V0dGluZ3MubWFudWFsKSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQuYWN0dWFsX3BlcmNlbnQgLSBwb2ludC5tYW51YWxfc3BcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeSA9IHBvaW50LmFjdHVhbF90ZW1wIC0gcG9pbnQudGVtcF9zcFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsaW5lc1twcm9wXVt6IC0gMV0ucHVzaCh7IHgsIHksIHRpbWU6IGZyYW1lLnRzIH0pXG4gICAgICAgIG1heFtwcm9wXSA9IE1hdGgubWF4KG1heFtwcm9wXSwgeSlcbiAgICAgICAgbWluW3Byb3BdID0gTWF0aC5taW4obWluW3Byb3BdLCB5KVxuICAgICAgfVxuICAgIH1cblxuXG4gICAgY29uc3Qgc2NhbGVQYXJhbXMgPSBzY2FsZS55W3Byb3BdXG4gICAgY29uc3QgeyBtaW5ZLCBtYXhZIH0gPSBnZXRZUGFyYW1ldGVycyhwcm9wLCBtaW5bcHJvcF0sIG1heFtwcm9wXSwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKVxuXG4gICAgbWluW3Byb3BdID0gbWluWVxuICAgIG1heFtwcm9wXSA9IG1heFlcblxuICAgIC8vIGVzdGFibGlzaCBwaXhlbCB0byB1bml0IHJhdGlvXG4gICAgYXV0b1NjYWxlW3Byb3BdID0gY2FudmFzLmhlaWdodCAvIChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pXG5cblxuICAgIHJlbmRlcmVkTGluZXNbcHJvcF0gPSBbXVxuICAgIHlWYWx1ZXNbcHJvcF0gPSB7XG4gICAgICB0b3RhbDogMCxcbiAgICAgIHRvdGFsUG9pbnRzOiAwXG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHkgcGl4ZWwgdmFsdWVzIGJhc2VkIG9uIGVzdGFibGlzaGVkIHNjYWxlXG4gICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzW3Byb3BdLmZpbHRlcih4ID0+ICEheCkpIHtcbiAgICAgIGxldCByZW5kZXJlZExpbmUgPSBbXVxuXG4gICAgICBmb3IgKGxldCBwb2ludCBvZiBsaW5lKSB7XG4gICAgICAgIHlWYWx1ZXNbcHJvcF0udG90YWwgKz0gcG9pbnQueVxuICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzICs9IDFcbiAgICAgICAgcG9pbnQueSA9IG9mZnNldFkgKyBwYXJzZUludChjYW52YXMuaGVpZ2h0IC0gKHBvaW50LnkgLSBtaW5bcHJvcF0pICogYXV0b1NjYWxlW3Byb3BdKVxuICAgICAgICByZW5kZXJlZExpbmUucHVzaChwb2ludClcbiAgICAgICAgdG90YWxQb2ludHMrK1xuICAgICAgfVxuXG4gICAgICByZW5kZXJlZExpbmVzW3Byb3BdLnB1c2gocmVuZGVyZWRMaW5lKVxuICAgIH1cblxuICAgIGF2Z1twcm9wXSA9IHlWYWx1ZXNbcHJvcF0udG90YWwgLyB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzXG5cbiAgICBpZih5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzID09IDApIHtcbiAgICAgIG1pbltwcm9wXSA9IDBcbiAgICAgIG1heFtwcm9wXSA9IDBcbiAgICB9XG4gIH1cblxuXG4gIGxldCBpbnNwZWN0aW9uRGV0YWlscyA9IGdldEluc3BlY3Rpb25EZXRhaWxzKG1vZGUsIHpvbmVzLCBpbnNwZWN0ZWRQb2ludCwgcmVuZGVyZWRMaW5lcylcbiAgaW5zcGVjdGlvbkRldGFpbHMuZnJhbWUgPSBnZXRGcmFtZShyZW5kZXJlZCwgaW5zcGVjdGlvbkRldGFpbHMucG9pbnRJbmRleCwgaW5zcGVjdGlvbkRldGFpbHMuem9uZSlcblxuICBjb25zdCBzZWxlY3RlZCA9IFsgaW5zcGVjdGlvbkRldGFpbHMuaW5kZXggXVxuXG4gIGlmKGNhbnZhcyAmJiBjdHgpIHtcbiAgICBkcmF3TGluZXMoX3Byb3BzLCBjYW52YXMsIHsgcmVuZGVyZWRMaW5lcywgc2VsZWN0ZWQsIHJlbmRlck1vZGUgfSlcbiAgfSBlbHNlIHtcbiAgICBzdWJtaXRMaW5lcyh7IHJlbmRlcmVkTGluZXMsIHNlbGVjdGVkLCByZW5kZXJNb2RlIH0pXG4gIH1cblxuICBjb25zdCBwbG90RmlsbGVkID0gc2FtcGxlLmxlbmd0aCA8IGJ1ZmZlci5hY3RpdmUubGVuZ3RoXG5cbiAgbG9nU3RhdHMoeyB0b3RhbFBvaW50cywgbWF4LCBtaW4sIGF2ZywgcGxvdEZpbGxlZCwgaW5zcGVjdGlvbkRldGFpbHMsIHhNYXgsIHhNaW4gfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhd1xuXG5cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cbmNvbnN0IGdldEZyYW1lID0gKHJlbmRlcmVkLCBpZHgsIHpvbmUpID0+IHtcbiAgLy8gY29uc29sZS5sb2coaWR4LCB6b25lLCByZW5kZXJlZC5sZW5ndGgpXG4gIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaWR4XVxuICAvLyBjb25zb2xlLmxvZyhmcmFtZSlcbiAgaWYoIWZyYW1lKSByZXR1cm4ge31cbiAgcmV0dXJuIGZyYW1lLmRhdGFbem9uZSAtIDFdXG59XG5cbi8vIGdldCB0aGUgeCBheGlzIGJvdW5kc1xuY29uc3QgZ2V0WFBhcmFtZXRlcnMgPSAocG9zaXRpb24sIGNhbnZhcywgc2NhbGUsIHBhdXNlZCwgYnVmZmVyUGFyYW1zKSA9PiB7XG4gIGNvbnN0IGxhdGVzdCA9IGJ1ZmZlci5hY3RpdmVbYnVmZmVyLmFjdGl2ZS5sZW5ndGggLSAxXVxuICBpZiAoIWxhdGVzdCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH1cblxuICBjb25zdCB4Wm9vbUZhY3RvciA9IHBvc2l0aW9uLnpvb21YXG4gIC8vIGxldCBzUmFuZ2UgPSBzY2FsZSAmJiBzY2FsZS54ID8gcGFyc2VJbnQoc2NhbGUueCkgOiAxMFxuICBsZXQgc1JhbmdlID0gcGFyc2VJbnQoc2NhbGUueClcblxuICBjb25zdCB4UmFuZ2UgPSBzUmFuZ2UgKiAxMDAwXG5cbiAgbGV0IHBhblhSYXRpbyA9IHBvc2l0aW9uLnBhblggLyBjYW52YXMud2lkdGhcbiAgbGV0IHRpbWVPZmZzZXQgPSB4UmFuZ2UgKiBwYW5YUmF0aW9cblxuICBjb25zdCBkZWxheSA9IE1hdGgubWF4KDEwMDAsIDEwMDAgLyBidWZmZXJQYXJhbXMucmF0ZSkgKiAyXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheSAtIHRpbWVPZmZzZXRcbiAgbGV0IHJhd1hNYXggPSBwYXVzZWQgPyBsYXRlc3QudGltZSAtIGRlbGF5ICogLjI1IC0gdGltZU9mZnNldCA6IG5vd1xuICBsZXQgcmF3WE1pbiA9IHJhd1hNYXggLSB4UmFuZ2VcblxuICBsZXQgbWlkID0gcmF3WE1pbiArIHhSYW5nZSAvIDJcbiAgY29uc3Qgc2NhbGVkID0geFJhbmdlICogeFpvb21GYWN0b3IgLyAyXG5cbiAgY29uc3QgeE1heCA9IG1pZCArIHNjYWxlZFxuICBjb25zdCB4TWluID0gbWlkIC0gc2NhbGVkXG5cbiAgY29uc3QgZFggPSB4TWF4IC0geE1pblxuICBjb25zdCB4U2NhbGUgPSBjYW52YXMud2lkdGggLyAoeE1heCAtIHhNaW4pXG5cbiAgcmV0dXJuIHsgeE1pbiwgeE1heCwgeFJhbmdlLCBkWCwgeFNjYWxlLCBkZWxheSwgdmFsaWQ6IHRydWUgfVxufVxuXG5cblxuLy8gZ2V0IHRoZSB5IGF4aXMgYm91bmRzXG5jb25zdCBnZXRZUGFyYW1ldGVycyA9IChwcm9wLCBtaW4sIG1heCwgc2NhbGVQYXJhbXMsIHBvc2l0aW9uKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKG1pbiwgbWF4KVxuICBpZiAoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgIG1pbiA9IE1hdGgubWF4KG1pbiwgMClcbiAgfVxuXG4gIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gIGNvbnN0IG1heEF1dG8gPSBzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nXG5cblxuICBpZiAoIW1pbkF1dG8pIG1pbiA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gIGlmICghbWF4QXV0bykgbWF4ID0gc2NhbGVQYXJhbXMubWF4ICogMTBcblxuICBjb25zdCByID0gbWF4IC0gbWluXG5cbiAgaWYgKHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWluICE9ICdhdXRvJykge1xuICAgIG1heCArPSByIC8gMTBcbiAgfVxuICBpZiAoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgbWluIC09IHIgLyAxMFxuICB9XG5cbiAgY29uc3Qgc2NhbGVGYWN0b3IgPSBwb3NpdGlvbi56b29tWVxuXG4gIGNvbnN0IGhhbGZSYW5nZSA9IChtYXggLSBtaW4pIC8gMlxuICBjb25zdCBtaWRQb2ludCA9IG1pbiArIGhhbGZSYW5nZVxuICBtaW4gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gIG1heCA9IG1pZFBvaW50ICsgaGFsZlJhbmdlICogc2NhbGVGYWN0b3JcblxuICBjb25zdCBzY2FsZWRNaW4gPSBtaW5cbiAgY29uc3Qgc2NhbGVkTWF4ID0gbWF4XG5cbiAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICBjb25zdCBldmVuID0gaSA9PiB7XG4gICAgaWYgKG1pbkF1dG8pIG1pbiA9IC1pICsgaSAqIE1hdGguY2VpbChtaW4gLyBpKVxuICAgIGlmIChtYXhBdXRvKSBtYXggPSBpICsgaSAqIE1hdGguZmxvb3IobWF4IC8gaSlcbiAgfVxuXG5cblxuICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gIGZvciAobGV0IHggb2YgWyAxMCwgMTAwLCAyMDAsIDUwMCwgMTAwMCwgMjAwMCwgNTAwMCwgMTAwMDAgXSkge1xuICAgIGlmIChtYXRjaGVkKSBicmVha1xuICAgIGZvciAobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgaWYgKHIgPCBiYXNlKSB7XG4gICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgIG1hdGNoZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKCFtYXRjaGVkKSBldmVuKDIwMDAwKVxuXG4gIGNvbnN0IG1heE9mZnNldCA9IHNjYWxlZE1heCAtIG1heCAvIChtYXggLSBtaW4pXG4gIGNvbnN0IG1pbk9mZnNldCA9IHNjYWxlZE1pbiAtIG1pbiAvIChtYXggLSBtaW4pXG5cbiAgcmV0dXJuIHsgbWluWTogbWluLCBtYXhZOiBtYXgsIG1heE9mZnNldCwgbWluT2Zmc2V0IH1cbn1cbiIsImV4cG9ydCBjb25zdCBtYXhDaHVua1NpemUgPSAxMDBcblxubGV0IHBhcmFtcyA9IHtcbiAgcmF0ZTogMTBcbn1cblxubGV0IGJ1ZmZlciA9IFtdXG5cblxuLy8gZW5zdXJlIGJ1ZmZlciBpcyBuZXZlciBmaWxsZWQgZmFzdGVyIHRoYW4gdGhlIHNwZWNpZmllZCByYXRlXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGZyYW1lLnRzID0gZnJhbWUudGltZS5nZXRUaW1lKClcbiAgY29uc3QgbGFzdEZyYW1lID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuICBpZighbGFzdEZyYW1lKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gICAgcmV0dXJuXG4gIH1cbiAgLy8gbWluIGludGVydmFsIGlzIG1pbiBtcyBiZXR3ZWVuIGZyYW1lcyB3aXRoIDVtcyBwYWRkaW5nXG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlICsgNVxuICBpZihmcmFtZS50aW1lIC0gbGFzdEZyYW1lLnRpbWUgPj0gbWluSW50dmwpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBidWZmZXJcblxuYnVmZmVyLndyaXRlID0gZnVuY3Rpb24gKHsgdHMsIGRhdGEgfSkge1xuXG4gIC8vIHNpbXVsYXRlIDQ1MCB6b25lc1xuICAvLyBkYXRhID0gZGF0YS5jb25jYXQoZGF0YSkuY29uY2F0KGRhdGEpXG5cbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRzKVxuICBjb25zdCBmcmFtZSA9IHsgZGF0YSwgZGF0ZSwgdGltZTogdHMgfVxuXG4gIHRyeVB1c2goZnJhbWUpXG4gIC8vIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcblxuICBjb25zdCBwb3N0ID0gKGRhdGEpID0+IHtcbiAgICBpZihwb3J0KSB7XG4gICAgICBwb3J0LnBvc3RNZXNzYWdlKGRhdGEpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgfVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9zdCgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvc3QoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiBuZXcgRGF0ZSh1cGRhdGVkVFMpLCB0czogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2gobmV4dCksIDUwMClcbn1cblxuXG5cbmNvbnN0IHR5cGVTaXplcyA9IHtcbiAgXCJ1bmRlZmluZWRcIjogKCkgPT4gMCxcbiAgXCJib29sZWFuXCI6ICgpID0+IDQsXG4gIFwibnVtYmVyXCI6ICgpID0+IDgsXG4gIFwic3RyaW5nXCI6IGl0ZW0gPT4gMiAqIGl0ZW0ubGVuZ3RoLFxuICBcIm9iamVjdFwiOiBpdGVtID0+ICFpdGVtID8gMCA6IE9iamVjdFxuICAgIC5rZXlzKGl0ZW0pXG4gICAgLnJlZHVjZSgodG90YWwsIGtleSkgPT4gc2l6ZU9mKGtleSkgKyBzaXplT2YoaXRlbVtrZXldKSArIHRvdGFsLCAwKVxufVxuXG5jb25zdCBzaXplT2YgPSB2YWx1ZSA9PiB0eXBlU2l6ZXNbdHlwZW9mIHZhbHVlXSh2YWx1ZSlcbiIsImltcG9ydCByZW5kZXJMaW5lIGZyb20gJy4vbGluZS1wbG90J1xuaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IG1heENodW5rU2l6ZSB9IGZyb20gJy4uL3JlYWx0aW1lL2J1ZmZlcidcblxubGV0IHJlcXVlc3RBbmltRnJhbWVcbnRyeSB7XG4gIHJlcXVlc3RBbmltRnJhbWUgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbn0gY2F0Y2goZSkge1xuICB0cnkge1xuICAgIHJlcXVlc3RBbmltRnJhbWUgPSB3ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfSBjYXRjaChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBtb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb24gKi8gY2FsbGJhY2ssIC8qIERPTUVsZW1lbnQgKi8gZWxlbWVudCkge1xuICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblxubGV0IHJlZnJlc2hSYXRlID0gNjBcblxuLy8gZ2V0IHJlZnJlc2ggcmF0ZSBmb3IgY3VycmVudCBkaXNwbGF5XG5jb25zdCBnZXRSZWZyZXNoUmF0ZSA9IGFzeW5jIChmcmFtZXMgPSA2MCkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCBsYXN0XG4gICAgY29uc3QgdGltZXMgPSBbXVxuICAgIGNvbnN0IGdldFRpbWUgPSBuID0+IHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICBpZihsYXN0KSB0aW1lcy5wdXNoKG5vdyAtIGxhc3QpXG4gICAgICBsYXN0ID0gbm93XG5cbiAgICAgIGlmKG4gPT0gMCkge1xuICAgICAgICBjb25zdCB0b3RhbCA9IHRpbWVzLnJlZHVjZSgodG90YWwsIHQpID0+IHRvdGFsICsgdCwgMClcbiAgICAgICAgY29uc3QgYXZnID0gdG90YWwgLyB0aW1lcy5sZW5ndGhcbiAgICAgICAgcmVzb2x2ZSgxMDAwIC8gYXZnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEFuaW1GcmFtZSgoKSA9PiBnZXRUaW1lKG4gLSAxKSlcbiAgICAgIH1cbiAgICB9XG4gICAgZ2V0VGltZShmcmFtZXMpXG4gIH0pXG59XG5cbmdldFJlZnJlc2hSYXRlKDEwMDApLnRoZW4ocmF0ZSA9PiB7XG4gIGlmKHJhdGUgPCA0MCkge1xuICAgIHJlZnJlc2hSYXRlID0gMzBcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhyZWZyZXNoUmF0ZSlcbn0pXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfSxcbiAgYnVmZmVyUGFyYW1zOiB7XG4gICAgcmF0ZTogMTBcbiAgfSxcbiAgLy8gY3VycmVudCBkYXRhcG9pbnQgZGVuc2l0eSBzZXR0aW5nICgxIC0gNClcbiAgcmVzb2x1dGlvbjogNFxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuLy8gbW9zdCByZWNlbnQgc2V0IG9mIHJlbmRlciB0aW1lcyAodG8gZGV0ZXJtaW5lIGZyYW1lIHJhdGUpXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG4vLyBmcmFtZXJhdGUgc25hcHNob3RzIHRvIG1vbml0b3Igc3lzdGVtIHN0cmFpblxubGV0IHBlcmZvcm1hbmNlSGlzdG9yeSA9IFtdXG5cbi8vIHRyYWNrIG1vc3QgcmVjZW50IFxubGV0IGxhc3RSZXNvbHV0aW9uQ2hhbmdlID0gbmV3IERhdGUoKS5nZXRUaW1lKClcblxuLy8gdHJhY2sgbnVtYmVyIG9mIHRpbWVzIG1heCBSZXNvbHV0aW9uIHJlY29tbWVuZGVkXG5sZXQgbWF4UmVzQ291bnQgPSAwXG5cblxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3NjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiwgb2Zmc2V0czogc3RhdHMub2Zmc2V0cywgaW5zcGVjdGlvbjogc3RhdHMuaW5zcGVjdGlvbkRldGFpbHMgfX0pXG4gICAgcmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXShjaGFydERhdGEsIGxvZ1N0YXRzLCBzdWJtaXRMaW5lcylcbiAgICByZW5kZXJUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbGFzdClcbiAgfVxuICBsYXN0ID0gdFxuICByZXF1ZXN0QW5pbUZyYW1lKGRyYXcpXG59XG5cbnJlcXVlc3RBbmltRnJhbWUoZHJhdylcblxuY29uc3Qgc3VibWl0TGluZXMgPSBsaW5lcyA9PiB7XG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ2xpbmVzJywgbGluZXMgfSlcbn1cblxuY29uc3QgY29sbGVjdFN0YXRzID0gKCkgPT4ge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLmNlaWwoMTAwMCAvIGF2Z1JlbmRlcilcbiAgcGVyZm9ybWFuY2VIaXN0b3J5LnB1c2goZnJhbWVyYXRlKVxuXG4gIC8vIGtlZXAgbGFzdCAxMHMgb2YgZnJhbWVyYXRlIGRhdGEgZm9yIHBlcmZvcm1hbmNlIG1vbml0b3JpbmdcbiAgcGVyZm9ybWFuY2VIaXN0b3J5ID0gcGVyZm9ybWFuY2VIaXN0b3J5LnNsaWNlKC0zMClcblxuICAvLyB0cnVuY2F0ZSBmcmFtZSBkYXRhIHRvIGtlZXAgYSByb2xsaW5nIGF2ZXJhZ2VcbiAgcmVuZGVyVGltZXMgPSByZW5kZXJUaW1lcy5zbGljZSgtNjApXG5cbiAgLy8gaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCwgY2FsY3VsYXRlIHJlY29tbWVuZGVkIHJlc29sdXRpb25cbiAgaWYobm93IC0gbGFzdFJlc29sdXRpb25DaGFuZ2UgPiAxMDAwKSB7XG4gICAgbGFzdFJlc29sdXRpb25DaGFuZ2UgPSBub3dcblxuICAgIGNvbnN0IHJlY29tbWVuZGVkID0gTWF0aC5jZWlsKChmcmFtZXJhdGUgLSAxNSkgKiA0IC8gKHJlZnJlc2hSYXRlIC0gMTUpKVxuXG4gICAgaWYocmVjb21tZW5kZWQgPiAzICYmIGNoYXJ0RGF0YS5yZXNvbHV0aW9uID09IDMpIHtcbiAgICAgIGlmKG1heFJlc0NvdW50ID4gMykge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IDRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heFJlc0NvdW50ICs9IDFcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWF4UmVzQ291bnQgPSAwXG5cbiAgICAgIC8vIGVuc3VyZSB3ZSdyZSBhaW1pbmcgZm9yIHJlY29tbWVuZGVkICsvLSAxXG4gICAgICBpZiAocmVjb21tZW5kZWQgLSAxID4gY2hhcnREYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgY2hhcnREYXRhLnJlc29sdXRpb24gKz0gMVxuICAgICAgfSBlbHNlIGlmIChyZWNvbW1lbmRlZCArIDEgPCBjaGFydERhdGEucmVzb2x1dGlvbikge1xuICAgICAgICBjaGFydERhdGEucmVzb2x1dGlvbiAtPSAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY2xhbXAgYXQgMSAtIDRcbiAgICBjaGFydERhdGEucmVzb2x1dGlvbiA9IE1hdGgubWF4KDEsIE1hdGgubWluKGNoYXJ0RGF0YS5yZXNvbHV0aW9uLCA0KSlcblxuICAgIHN0YXRzLnJlc29sdXRpb24gPSBjaGFydERhdGEucmVzb2x1dGlvblxuICB9XG5cbiAgc3RhdHMgPSB7IC4uLnN0YXRzLCBmcmFtZXJhdGUgfVxuICBjaGFydERhdGEuZnJhbWVyYXRlID0gZnJhbWVyYXRlXG5cbiAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAnc3RhdHMnLCB2YWx1ZTogc3RhdHMgfSlcbn1cblxuc2V0SW50ZXJ2YWwoY29sbGVjdFN0YXRzLCAxMDAwIC8gMylcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMgJiYgZS5kYXRhLmNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwicmVuZGVyTGluZSIsImRyYXciXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUksTUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7RUFDQSxNQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQzlCO0VBQ0EsRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQy9FLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNoRCxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBRTtFQUN6QyxHQUFHO0VBQ0gsRUFBQztFQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxHQUFHLEdBQUU7RUFDeEMsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBSztFQUN6QyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sTUFBTSxD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
