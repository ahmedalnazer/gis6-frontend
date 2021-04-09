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


    const xZoomFactor = (position.zoomX + 105) / 100;
    let xRange = (scale && scale.x ? parseInt(scale.x) : 10) * xZoomFactor;

    if(isNaN(xRange)) xRange = 10;

    let panXRatio = position.panX / canvas.width;
    let timeOffset = xRange * panXRatio * 1000;

    const delay = Math.max(1000, 10 * xRange);

    const now = new Date().getTime() - delay - timeOffset;
    let xMax = paused ? latest ? latest.time - delay * .25 - timeOffset : now : now;
    let xMin = xMax - xRange * 1000;
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

      const scaleFactor = 8 * (position.zoomY + 105) / 400;

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


    const offsetY = -position.panY;

    let offsets = {};

    // assign y values and prepare to calculate averages
    for(let prop of properties) {
      const ratio = offsetY / canvas.height;
      offsets[prop] = ratio * (max[prop] - min[prop]);
      offsets[prop] = offsetY / autoScale[prop];

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

    logStats({ totalPoints, max, min, avg, plotFilled: sample.length < buffer$1.active.length, xMax, xMin, offsets });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgc21vb3RoIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG5leHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cblxuXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgem9uZXMsIGJ1ZmZlclBhcmFtcywgcG9zaXRpb24gfSA9IGNoYXJ0RGF0YVxuXG4gIGNvbnN0IHJhdGUgPSBidWZmZXJQYXJhbXMgPyBidWZmZXJQYXJhbXMucmF0ZSA6IDEwXG5cbiAgY29uc3QgX3Byb3BzID0gY2hhcnREYXRhLnByb3BlcnRpZXNcbiAgY29uc3QgcHJvcGVydGllcyA9IF9wcm9wcy5maWx0ZXIoeCA9PiAhIXgpXG5cbiAgbGV0IG1heExpbmVQb2ludHMgPSBNYXRoLm1pbig3MDAsIE1hdGgubWF4KDgwLCAyMDAwMCAvICh6b25lcy5sZW5ndGggKiBwcm9wZXJ0aWVzLmxlbmd0aCkpKVxuXG4gIC8vIGlmKHpvbmVzLmxlbmd0aCA+IDEwKSBtYXhMaW5lUG9pbnRzID0gNjBcblxuICAvLyBpZih6b25lcy5sZW5ndGggPiA1MCkgbWF4TGluZVBvaW50cyA9IDMwXG5cbiAgLy8gaWYoem9uZXMubGVuZ3RoID4gMTAwKSBtYXhMaW5lUG9pbnRzID0gMTBcbiAgXG4gIGNvbnN0IGxhdGVzdCA9IGJ1ZmZlci5hY3RpdmVbYnVmZmVyLmFjdGl2ZS5sZW5ndGggLSAxXVxuXG5cbiAgY29uc3QgeFpvb21GYWN0b3IgPSAocG9zaXRpb24uem9vbVggKyAxMDUpIC8gMTAwXG4gIGxldCB4UmFuZ2UgPSAoc2NhbGUgJiYgc2NhbGUueCA/IHBhcnNlSW50KHNjYWxlLngpIDogMTApICogeFpvb21GYWN0b3JcblxuICBpZihpc05hTih4UmFuZ2UpKSB4UmFuZ2UgPSAxMFxuXG4gIGxldCBwYW5YUmF0aW8gPSBwb3NpdGlvbi5wYW5YIC8gY2FudmFzLndpZHRoXG4gIGxldCB0aW1lT2Zmc2V0ID0geFJhbmdlICogcGFuWFJhdGlvICogMTAwMFxuXG4gIGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMTAwMCwgMTAgKiB4UmFuZ2UpXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheSAtIHRpbWVPZmZzZXRcbiAgbGV0IHhNYXggPSBwYXVzZWQgPyBsYXRlc3QgPyBsYXRlc3QudGltZSAtIGRlbGF5ICogLjI1IC0gdGltZU9mZnNldCA6IG5vdyA6IG5vd1xuICBsZXQgeE1pbiA9IHhNYXggLSB4UmFuZ2UgKiAxMDAwXG4gIGxldCByZW5kZXJMaW1pdCA9IHhNaW4gLSAyMDAwXG4gIGxldCBkWCA9IHhNYXggLSB4TWluXG5cbiAgLy8gbGV0IHNhbXBsZSA9IGJ1ZmZlci5hY3RpdmUuZmlsdGVyKHggPT4geC50aW1lID4gcmVuZGVyTGltaXQpXG5cbiAgbGV0IHNhbXBsZSA9IFtdXG5cbiAgZm9yIChsZXQgaSA9IGJ1ZmZlci5hY3RpdmUubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IGZyYW1lID0gYnVmZmVyLmFjdGl2ZVtpXVxuICAgIC8vIGNvbnNvbGUubG9nKGZyYW1lICYmIGZyYW1lLnRpbWUsIHJlbmRlckxpbWl0KVxuICAgIGlmIChmcmFtZSkge1xuICAgICAgaWYgKGZyYW1lLnRpbWUgPj0gcmVuZGVyTGltaXQpIHtcbiAgICAgICAgc2FtcGxlLnVuc2hpZnQoZnJhbWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICAvLyBkZXRlcm1pbmUgd2hpY2ggcG9pbnRzIHNob3VsZCBiZSBmaWx0ZXJlZCBiYXNlZCBvbiBtYXggcG9pbnRzIHBlciBsaW5lXG4gIGNvbnN0IG1pbk1TSW50ZXJ2YWwgPSBkWCAvIG1heExpbmVQb2ludHNcblxuICBsZXQgcmVuZGVyZWQgPSBbXVxuXG4gIC8vIGZpbHRlciBkYXRhIHBvaW50cyB0byBleGNsdWRlIG9uZXMgaW4gdGhlIGV4Y2x1ZGVkIHRpbWUgaW50ZXJ2YWxzXG4gIGZvcihsZXQgaSA9IDA7IGkgPCBzYW1wbGUubGVuZ3RoOyBpKyspIHtcbiAgICBpZihpID09IDAgfHwgIXJlbmRlcmVkLmxlbmd0aCB8fCBpID09IHNhbXBsZS5sZW5ndGggLSAxKSB7XG4gICAgICByZW5kZXJlZC5wdXNoKHNhbXBsZVtpXSlcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKChzYW1wbGVbaV0udGltZSAtIDE2MTQ3OTkxNjAwMDApICUgIG1pbk1TSW50ZXJ2YWwgPCAyMDAwIC8gcmF0ZSkge1xuICAgICAgICByZW5kZXJlZC5wdXNoKHNhbXBsZVtpXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyByZW5kZXJlZC5yZXZlcnNlKClcblxuICBsZXQgbGluZXMgPSB7fVxuICBsZXQgbWF4ID0ge31cbiAgbGV0IG1pbiA9IHt9XG4gIGxldCBhdXRvU2NhbGUgPSB7fVxuXG4gIGZvciAobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgIGxpbmVzW3Byb3BdID0gW11cbiAgICBtYXhbcHJvcF0gPSAwXG4gICAgbWluW3Byb3BdID0gOTk5OTk5OTk5OTk5OTlcbiAgfVxuXG5cbiAgZm9yKGxldCBpID0gMDsgaSA8IHJlbmRlcmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgZnJhbWUgPSByZW5kZXJlZFtpXVxuICAgIFxuICAgIGNvbnN0IHggPSAoZnJhbWUudGltZSAtIHhNaW4pICogeFNjYWxlXG5cbiAgICBmb3IgKGxldCB6IG9mIHpvbmVzKSB7XG4gICAgICBjb25zdCBwb2ludCA9IGZyYW1lLmRhdGFbeiAtIDFdXG5cbiAgICAgIGZvciAobGV0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgICAgICBpZiAoIWxpbmVzW3Byb3BdW3ogLSAxXSkgbGluZXNbcHJvcF1beiAtIDFdID0gW11cbiAgICAgICAgbGV0IHkgPSBwb2ludFtwcm9wXVxuICAgICAgICBpZiAocHJvcCA9PSAnZGV2aWF0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gZ2V0U2V0dGluZ3MocG9pbnQpXG4gICAgICAgICAgaWYgKHNldHRpbmdzLm1hbnVhbCkge1xuICAgICAgICAgICAgeSA9IHBvaW50Lm1hbnVhbF9zcCAtIHBvaW50LmFjdHVhbF9wZXJjZW50XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC50ZW1wX3NwIC0gcG9pbnQuYWN0dWFsX3RlbXBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGluZXNbcHJvcF1beiAtIDFdLnB1c2goeyB4LCB5IH0pXG4gICAgICAgIGlmKHggPCB4TWF4KSB7XG4gICAgICAgICAgaWYgKHkgPiBtYXhbcHJvcF0pIG1heFtwcm9wXSA9IHlcbiAgICAgICAgICBpZiAoeSA8IG1pbltwcm9wXSkgbWluW3Byb3BdID0geVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcblxuICAgIGNvbnN0IHNjYWxlUGFyYW1zID0gc2NhbGUueSAmJiBzY2FsZS55W3Byb3BdXG5cbiAgICBpZighbmVnYXRpdmVzLmluY2x1ZGVzKHByb3ApKSB7XG4gICAgICBtaW5bcHJvcF0gPSBNYXRoLm1heChtaW5bcHJvcF0sIDEpXG4gICAgfVxuXG4gICAgY29uc3QgbWluQXV0byA9IHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bydcbiAgICBjb25zdCBtYXhBdXRvID0gc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJ1xuXG5cbiAgICBpZiAoc2NhbGVQYXJhbXMpIHtcbiAgICAgIGlmICghbWluQXV0bykgbWluW3Byb3BdID0gc2NhbGVQYXJhbXMubWluICogMTBcbiAgICAgIGlmICghbWF4QXV0bykgbWF4W3Byb3BdID0gc2NhbGVQYXJhbXMubWF4ICogMTBcbiAgICB9XG5cbiAgICBjb25zdCByID0gbWF4W3Byb3BdIC0gbWluW3Byb3BdXG5cbiAgICBpZihzY2FsZVBhcmFtcy5tYXggPT0gJ2F1dG8nICYmIHNjYWxlUGFyYW1zLm1pbiAhPSAnYXV0bycpIHtcbiAgICAgIG1heFtwcm9wXSArPSByIC8gMTBcbiAgICB9XG4gICAgaWYoc2NhbGVQYXJhbXMubWluID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5tYXggIT0gJ2F1dG8nKSB7XG4gICAgICBtaW5bcHJvcF0gLT0gciAvIDEwXG4gICAgfVxuXG4gICAgY29uc3Qgc2NhbGVGYWN0b3IgPSA4ICogKHBvc2l0aW9uLnpvb21ZICsgMTA1KSAvIDQwMFxuXG4gICAgY29uc3QgaGFsZlJhbmdlID0gKG1heFtwcm9wXSAtIG1pbltwcm9wXSkgLyAyXG4gICAgY29uc3QgbWlkUG9pbnQgPSBtaW5bcHJvcF0gKyBoYWxmUmFuZ2VcbiAgICBtaW5bcHJvcF0gPSBtaWRQb2ludCAtIGhhbGZSYW5nZSAqIHNjYWxlRmFjdG9yXG4gICAgbWF4W3Byb3BdID0gbWlkUG9pbnQgKyBoYWxmUmFuZ2UgKiBzY2FsZUZhY3RvclxuICAgIC8vIGlmIChtYXhbcHJvcF0gPCBtaW5bcHJvcF0gKyAxMCkge1xuICAgIC8vICAgbWF4W3Byb3BdID0gbWluW3Byb3BdICsgMTBcbiAgICAvLyB9XG4gICAgXG5cbiAgICAvLyBlbnN1cmUgcm91bmQgbnVtYmVycyBhcmUgdXNlZCBmb3IgdGhlIHNjYWxlXG4gICAgY29uc3QgZXZlbiA9IGkgPT4ge1xuICAgICAgaWYobWluQXV0bykgbWluW3Byb3BdID0gLWkgKyBpICogTWF0aC5jZWlsKG1pbltwcm9wXSAvIGkpXG4gICAgICBpZihtYXhBdXRvKSBtYXhbcHJvcF0gPSBpICsgaSAqIE1hdGguZmxvb3IobWF4W3Byb3BdIC8gaSlcbiAgICB9XG5cbiAgICBsZXQgbWF0Y2hlZCA9IGZhbHNlXG4gICAgZm9yKGxldCB4IG9mIFsgMSwgMTAsIDEwMCwgMjAwLCA1MDAsIDEwMDAsIDIwMDAsIDUwMDAsIDEwMDAwIF0pIHtcbiAgICAgIGlmKG1hdGNoZWQpIGJyZWFrXG4gICAgICBmb3IobGV0IHkgb2YgWyAxLCAyLCA0LCA4IF0pIHtcbiAgICAgICAgY29uc3QgYmFzZSA9IHggKiB5XG4gICAgICAgIGlmKHIgPCBiYXNlKSB7XG4gICAgICAgICAgZXZlbihiYXNlIC8gNSlcbiAgICAgICAgICBtYXRjaGVkID0gdHJ1ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZighbWF0Y2hlZCkge1xuICAgICAgZXZlbigyMDAwMClcbiAgICB9XG4gICAgXG4gICAgYXV0b1NjYWxlW3Byb3BdID0gY2FudmFzLmhlaWdodCAvIChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pXG4gIH1cblxuXG4gIC8vIHNpbXBsaWZpZWQgbGluZXMgZm9yIHJlbmRlcmluZ1xuICBsZXQgcmVuZGVyZWRMaW5lcyA9IHt9XG5cbiAgLy8gdHJhY2sgYWxsIHJlbmRlcmVkIHZhbHVlcyBwZXIgcHJvcGVydHlcbiAgbGV0IHlWYWx1ZXMgPSB7fVxuXG4gIGxldCB0b3RhbFBvaW50cyA9IDBcblxuXG4gIGNvbnN0IG9mZnNldFkgPSAtcG9zaXRpb24ucGFuWVxuXG4gIGxldCBvZmZzZXRzID0ge31cbiAgbGV0IG9mZnNldFRvcCA9IDBcblxuICAvLyBhc3NpZ24geSB2YWx1ZXMgYW5kIHByZXBhcmUgdG8gY2FsY3VsYXRlIGF2ZXJhZ2VzXG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgY29uc3QgcmF0aW8gPSBvZmZzZXRZIC8gY2FudmFzLmhlaWdodFxuICAgIG9mZnNldHNbcHJvcF0gPSByYXRpbyAqIChtYXhbcHJvcF0gLSBtaW5bcHJvcF0pXG4gICAgb2Zmc2V0c1twcm9wXSA9IG9mZnNldFkgLyBhdXRvU2NhbGVbcHJvcF1cblxuICAgIHJlbmRlcmVkTGluZXNbcHJvcF0gPSBbXVxuICAgIHlWYWx1ZXNbcHJvcF0gPSB7XG4gICAgICB0b3RhbDogMCxcbiAgICAgIHRvdGFsUG9pbnRzOiAwXG4gICAgfVxuXG4gICAgZm9yKGxldCBpID0gMDsgaSA8IGxpbmVzW3Byb3BdLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihsaW5lc1twcm9wXVtpXSkge1xuICAgICAgICByZW5kZXJlZExpbmVzW3Byb3BdW2ldID0gW11cblxuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IGxpbmVzW3Byb3BdW2ldLmxlbmd0aDsgcCsrKSB7XG4gICAgICAgICAgbGV0IHBvaW50ID0gbGluZXNbcHJvcF1baV1bcF1cbiAgICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsICs9IHBvaW50LnlcbiAgICAgICAgICB5VmFsdWVzW3Byb3BdLnRvdGFsUG9pbnRzICs9IDFcbiAgICAgICAgICBwb2ludC55ID0gb2Zmc2V0WSArIHBhcnNlSW50KGNhbnZhcy5oZWlnaHQgLSAocG9pbnQueSAtIG1pbltwcm9wXSkgKiBhdXRvU2NhbGVbcHJvcF0pXG4gICAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXS5wdXNoKHBvaW50KVxuICAgICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgY29uc3QgbGluZUNvbG9ycyA9IHtcbiAgICBbX3Byb3BzWzBdXTogY29sb3JzWzFdLFxuICAgIFtfcHJvcHNbMV1dOiBjb2xvcnNbMl0sXG4gICAgW19wcm9wc1syXV06IGNvbG9yc1szXSxcbiAgICBbX3Byb3BzWzNdXTogY29sb3JzWzRdXG4gIH1cblxuICAvLyBjbGVhciBjYW52YXMgZm9yIG5ldyBmcmFtZVxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodClcblxuICBsZXQgYXZnID0ge31cbiAgZm9yKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBhdmdbcHJvcF0gPSB5VmFsdWVzW3Byb3BdLnRvdGFsIC8geVZhbHVlc1twcm9wXS50b3RhbFBvaW50c1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCByZW5kZXJlZExpbmVzW3Byb3BdLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihyZW5kZXJlZExpbmVzW3Byb3BdW2ldKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSByZW5kZXJlZExpbmVzW3Byb3BdW2ldXG4gICAgICAgIHNtb290aChjdHgsIGxpbmUsIGxpbmVDb2xvcnNbcHJvcF0sIDEpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYodG90YWxQb2ludHMgPT0gMCkge1xuICAgIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgICBtaW5bcHJvcF0gPSAwXG4gICAgICBtYXhbcHJvcF0gPSAwXG4gICAgfVxuICB9XG5cbiAgbG9nU3RhdHMoeyB0b3RhbFBvaW50cywgbWF4LCBtaW4sIGF2ZywgcGxvdEZpbGxlZDogc2FtcGxlLmxlbmd0aCA8IGJ1ZmZlci5hY3RpdmUubGVuZ3RoLCB4TWF4LCB4TWluLCBvZmZzZXRzIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRyYXciLCJleHBvcnQgY29uc3QgbWF4Q2h1bmtTaXplID0gMTAwXG5cbmxldCBwYXJhbXMgPSB7XG4gIHJhdGU6IDEwXG59XG5cbmxldCBidWZmZXIgPSBbXVxuXG5cbi8vIGVuc3VyZSBidWZmZXIgaXMgbmV2ZXIgZmlsbGVkIGZhc3RlciB0aGFuIHRoZSBzcGVjaWZpZWQgcmF0ZVxuY29uc3QgdHJ5UHVzaCA9IChmcmFtZSkgPT4ge1xuICBmcmFtZS50cyA9IGZyYW1lLnRpbWUuZ2V0VGltZSgpXG4gIGNvbnN0IGxhc3RGcmFtZSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cbiAgaWYoIWxhc3RGcmFtZSkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICAgIHJldHVyblxuICB9XG4gIC8vIG1pbiBpbnRlcnZhbCBpcyBtaW4gbXMgYmV0d2VlbiBmcmFtZXMgd2l0aCA1bXMgcGFkZGluZ1xuICBjb25zdCBtaW5JbnR2bCA9IDEwMDAgLyBwYXJhbXMucmF0ZSArIDVcbiAgaWYoZnJhbWUudGltZSAtIGxhc3RGcmFtZS50aW1lID49IG1pbkludHZsKSB7XG4gICAgYnVmZmVyLnB1c2goZnJhbWUpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgYnVmZmVyXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uICh7IHRzLCBkYXRhIH0pIHtcblxuICAvLyBzaW11bGF0ZSA0NTAgem9uZXNcbiAgLy8gZGF0YSA9IGRhdGEuY29uY2F0KGRhdGEpLmNvbmNhdChkYXRhKVxuXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0cylcbiAgY29uc3QgZnJhbWUgPSB7IGRhdGEsIGRhdGUsIHRpbWU6IHRzIH1cblxuICB0cnlQdXNoKGZyYW1lKVxuICAvLyB0d2VlbihmcmFtZSwgMTIpXG5cbiAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKC03NTAwKVxufVxuXG5cbmxldCBpbnRlcnZhbHMgPSB7fVxubGV0IGxhdGVzdCA9IHt9XG5sZXQgZWFybGllc3QgPSB7fVxubGV0IG5lZWRzUmVzZXQgPSB7fVxuXG5leHBvcnQgY29uc3QgYnVmZmVyQ29tbWFuZHMgPSAocG9ydCwgZSwgaWQpID0+IHtcbiAgY29uc3QgeyBkYXRhIH0gPSBlXG4gIFxuICBpZiAoZGF0YS5jb21tYW5kID09ICdyZWFkQnVmZmVyJykge1xuXG4gICAgLy8gc2VuZCBkYXRhIGluIGJhdGNoZXMsIGxpbWl0aW5nIG1heCB0byBhdm9pZCBPT00gd2hlbiBzZXJpYWxpemluZyB0b1xuICAgIC8vIHBhc3MgYmV0d2VlbiB0aHJlYWRzXG4gICAgY29uc3Qgc2VuZENodW5rID0gKCkgPT4ge1xuICAgICAgY29uc3QgcmVzZXRCdWZmZXIgPSAoKSA9PiB7XG4gICAgICAgIGxhdGVzdFtpZF0gPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdICYmIGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0udHNcbiAgICAgICAgZWFybGllc3RbaWRdID0gbGF0ZXN0W2lkXSArIDFcbiAgICAgICAgbmVlZHNSZXNldFtpZF0gPSBmYWxzZVxuICAgICAgfVxuICAgICAgaWYgKCFsYXRlc3RbaWRdICYmIGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgcmVzZXRCdWZmZXIoKVxuICAgICAgfVxuXG4gICAgICBpZihuZWVkc1Jlc2V0W2lkXSkge1xuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlKCdyZXNldCcpXG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKGxhdGVzdFtpZF0pIHtcbiAgICAgICAgY29uc3QgbmV3ZXN0ID0gYnVmZmVyLmZpbHRlcih4ID0+IHgudHMgPiBsYXRlc3RbaWRdKVxuICAgICAgICBjb25zdCBiYWNrRmlsbCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzIDwgZWFybGllc3RbaWRdKS5zbGljZSgtKG1heENodW5rU2l6ZSAtIG5ld2VzdC5sZW5ndGgpKVxuICAgICAgICBjb25zdCB1cGRhdGUgPSBiYWNrRmlsbC5jb25jYXQobmV3ZXN0KVxuICAgICAgICBpZiAodXBkYXRlLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IGxhdGVzdEVudHJ5ID0gdXBkYXRlW3VwZGF0ZS5sZW5ndGggLSAxXVxuICAgICAgICAgIGNvbnN0IGZpcnN0RW50cnkgPSB1cGRhdGVbMF1cbiAgICAgICAgICBsYXRlc3RbaWRdID0gbGF0ZXN0RW50cnkudGltZVxuICAgICAgICAgIGlmKGZpcnN0RW50cnkudGltZSA8IGVhcmxpZXN0W2lkXSkgZWFybGllc3RbaWRdID0gZmlyc3RFbnRyeS50aW1lXG4gICAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSh7IHVwZGF0ZSwgcGFyYW1zIH0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKHNpemVPZihbIC4uLmJ1ZmZlciBdKSlcbiAgICB9XG5cbiAgICBpbnRlcnZhbHNbaWRdID0gc2V0SW50ZXJ2YWwoc2VuZENodW5rLCAyMDApXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdzZXRCdWZmZXJQYXJhbXMnKSB7XG4gICAgbGV0IHJlc2V0ID0gZmFsc2VcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBwYXJhbXMnLCBkYXRhLnBhcmFtcylcbiAgICBmb3IobGV0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhLnBhcmFtcykpIHtcbiAgICAgIGlmKGRhdGEucGFyYW1zW2tleV0gIT0gcGFyYW1zW2tleV0pIHtcbiAgICAgICAgcmVzZXQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICAgIHBhcmFtcyA9IHsgLi4ucGFyYW1zLCAuLi5kYXRhLnBhcmFtcyB8fCB7fX1cbiAgICBpZihyZXNldCkge1xuICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIDApXG4gICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMobmVlZHNSZXNldCkpIHtcbiAgICAgICAgbmVlZHNSZXNldFtrZXldID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gXG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiBuZXcgRGF0ZSh1cGRhdGVkVFMpLCB0czogdXBkYXRlZFRTLCBkYXRlLCBkYXRhOiB0d2VlbiB9KSwgb2Zmc2V0KVxuICAgIH1cbiAgfVxuICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2gobmV4dCksIDUwMClcbn1cblxuXG5cbmNvbnN0IHR5cGVTaXplcyA9IHtcbiAgXCJ1bmRlZmluZWRcIjogKCkgPT4gMCxcbiAgXCJib29sZWFuXCI6ICgpID0+IDQsXG4gIFwibnVtYmVyXCI6ICgpID0+IDgsXG4gIFwic3RyaW5nXCI6IGl0ZW0gPT4gMiAqIGl0ZW0ubGVuZ3RoLFxuICBcIm9iamVjdFwiOiBpdGVtID0+ICFpdGVtID8gMCA6IE9iamVjdFxuICAgIC5rZXlzKGl0ZW0pXG4gICAgLnJlZHVjZSgodG90YWwsIGtleSkgPT4gc2l6ZU9mKGtleSkgKyBzaXplT2YoaXRlbVtrZXldKSArIHRvdGFsLCAwKVxufVxuXG5jb25zdCBzaXplT2YgPSB2YWx1ZSA9PiB0eXBlU2l6ZXNbdHlwZW9mIHZhbHVlXSh2YWx1ZSkiLCJpbXBvcnQgcmVuZGVyTGluZSBmcm9tICcuL2xpbmUtcGxvdCdcbmltcG9ydCBidWZmZXIgZnJvbSAnLi9idWZmZXInXG5pbXBvcnQgeyBtYXhDaHVua1NpemUgfSBmcm9tICcuLi9yZWFsdGltZS9idWZmZXInXG5cblxuY29uc3QgcmVuZGVyZXJzID0ge1xuICAnbGluZSc6IHJlbmRlckxpbmVcbn1cblxubGV0IGNoYXJ0RGF0YSA9IHtcbiAgY2FudmFzOiBudWxsLFxuICBjdHg6IG51bGwsXG4gIHR5cGU6ICcnLFxuICBwcm9wZXJ0aWVzOiBbXSxcbiAgc2NhbGU6IHtcbiAgICB4OiAxMCxcbiAgICB5OiAnYXV0bydcbiAgfVxufVxuXG5sZXQgcG9ydFxuXG5cbmxldCBzdGF0cyA9IHt9XG5jb25zdCBsb2dTdGF0cyA9IHMgPT4gc3RhdHMgPSB7IC4uLnN0YXRzLCAuLi5zIH1cblxuXG5sZXQgcmVuZGVyVGltZXMgPSBbXVxuXG5sZXQgbGFzdCA9IDBcbmNvbnN0IGRyYXcgPSAoKSA9PiB7XG4gIGNvbnN0IHQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICBpZiAoY2hhcnREYXRhLmN0eCkge1xuICAgIGlmIChyZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKSB7XG4gICAgICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdzY2FsZScsIHZhbHVlOiB7IHhNYXg6IHN0YXRzLnhNYXgsIHhNaW46IHN0YXRzLnhNaW4sIG9mZnNldHM6IHN0YXRzLm9mZnNldHMgfX0pXG4gICAgICByZW5kZXJlcnNbY2hhcnREYXRhLnR5cGVdKGNoYXJ0RGF0YSwgbG9nU3RhdHMpXG4gICAgICByZW5kZXJUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbGFzdClcbiAgICB9XG4gIH1cbiAgbGFzdCA9IHRcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpXG59XG5cbnJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KVxuXG5cbmNvbnN0IGNvbGxlY3RTdGF0cyA9ICgpID0+IHtcbiAgY29uc3QgdG90YWxSZW5kZXIgPSByZW5kZXJUaW1lcy5yZWR1Y2UoKHQsIHRvdGFsKSA9PiB0b3RhbCArIHQsIDApXG4gIGNvbnN0IGF2Z1JlbmRlciA9IHRvdGFsUmVuZGVyIC8gcmVuZGVyVGltZXMubGVuZ3RoXG4gIGNvbnN0IGZyYW1lcmF0ZSA9IE1hdGguY2VpbCgxMDAwIC8gYXZnUmVuZGVyKVxuICByZW5kZXJUaW1lcyA9IHJlbmRlclRpbWVzLnNsaWNlKC01MClcblxuICBzdGF0cyA9IHsgLi4uc3RhdHMsIGZyYW1lcmF0ZSB9XG4gIGNoYXJ0RGF0YS5mcmFtZXJhdGUgPSBmcmFtZXJhdGVcblxuICBwb3N0TWVzc2FnZSh7IHR5cGU6ICdzdGF0cycsIHZhbHVlOiBzdGF0cyB9KVxufVxuXG5zZXRJbnRlcnZhbChjb2xsZWN0U3RhdHMsIDMgLyAxMDApXG5cblxuXG5cbmNvbnN0IGluaXRpYWxpemUgPSBhc3luYyAoKSA9PiB7XG4gIHBvcnQub25tZXNzYWdlID0gZSA9PiB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBlXG4gICAgaWYoZGF0YSA9PSAncmVzZXQnKSB7XG4gICAgICBidWZmZXIucmVzZXQoKVxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0cy5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgY2hhcnREYXRhLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBpZiAoZGF0YS51cGRhdGUgJiYgZGF0YS51cGRhdGUubGVuZ3RoID09IG1heENodW5rU2l6ZSkge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gdHJ1ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IGZhbHNlXG4gICAgICB9XG4gICAgICBidWZmZXIud3JpdGUoZGF0YS51cGRhdGUpXG4gICAgfVxuICB9XG5cbiAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdyZWFkQnVmZmVyJyB9KVxufVxuXG5cbm9ubWVzc2FnZSA9IGUgPT4ge1xuICBpZiAoZS5kYXRhLndzUG9ydCkge1xuICAgIHBvcnQgPSBlLmRhdGEud3NQb3J0XG4gICAgaW5pdGlhbGl6ZSgpXG4gIH0gZWxzZSBpZiAoZS5kYXRhID09ICdjbG9zZScpIHtcbiAgICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2Nsb3NlJyB9KVxuICB9IGVsc2Uge1xuICAgIGNoYXJ0RGF0YSA9IHsgLi4uY2hhcnREYXRhLCAuLi5lLmRhdGEgfVxuICAgIC8vIGNvbnNvbGUubG9nKCd1cGRhdGluZyBkYXRhJywgY2hhcnREYXRhKVxuICAgIGlmIChjaGFydERhdGEucGF1c2VkKSB7XG4gICAgICBidWZmZXIucGF1c2UoKVxuICAgIH0gZWxzZSB7XG4gICAgICBidWZmZXIucGxheSgpXG4gICAgfVxuICAgIGlmIChlLmRhdGEuY2FudmFzKSB7XG4gICAgICBjaGFydERhdGEuY3R4ID0gY2hhcnREYXRhLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcbiAgICB9XG4gIH1cbn0iXSwibmFtZXMiOlsiYnVmZmVyIiwiZHJhdyIsInJlbmRlckxpbmUiXSwibWFwcGluZ3MiOiI7OztFQUFBLElBQUlBLFFBQU0sR0FBRztFQUNiLEVBQUUsT0FBTyxFQUFFLEVBQUU7RUFDYixFQUFFLE1BQU0sRUFBRSxFQUFFO0VBQ1osRUFBRSxNQUFNLEVBQUUsS0FBSztFQUNmLEVBQUM7QUFHRDtBQUNBO0FBQ0FBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJLEVBQUU7RUFDOUI7RUFDQSxFQUFFQSxRQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBQztFQUM5RCxFQUFFQSxRQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ2hELEVBQUUsR0FBRyxDQUFDQSxRQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUlBLFFBQU0sQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxHQUFFO0VBQ3pDLEdBQUc7RUFDSCxFQUFDO0FBQ0RBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFFO0FBQ3hDQSxVQUFNLENBQUMsSUFBSSxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxNQUFNLEdBQUcsTUFBSztBQUN6Q0EsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHOztFQ2xCOUIsU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO0VBQ2xELEVBQUUsR0FBRyxDQUFDLFdBQVcsR0FBRyxNQUFLO0VBQ3pCLEVBQUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxNQUFLO0VBQ3ZCO0FBQ0E7RUFDQSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEdBQUU7RUFDakIsRUFBRSxJQUFJLE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDakQsSUFBSSxPQUFPLElBQUk7RUFDZixHQUFHO0VBQ0gsRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0VBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDeEMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN4QyxJQUFJLE9BQU8sSUFBSTtFQUNmLEdBQUc7RUFDSCxFQUFFLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7RUFDMUIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztFQUN4QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ3hDLElBQUksT0FBTyxJQUFJO0VBQ2YsR0FBRztFQUNILEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDdEMsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDOUM7RUFDQSxJQUFJLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQ2hELElBQUksSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDaEQ7RUFDQSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBQztFQUMxRCxHQUFHO0VBQ0gsRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQ2xGLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRTtFQUNkOztFQzNCTyxNQUFNLE1BQU0sR0FBRztFQUN0QixFQUFFLENBQUMsRUFBRSxTQUFTO0VBQ2QsRUFBRSxDQUFDLEVBQUUsU0FBUztFQUNkLEVBQUUsQ0FBQyxFQUFFLFNBQVM7RUFDZCxFQUFFLENBQUMsRUFBRSxTQUFTO0VBQ2QsRUFBQztBQUNEO0VBQ0E7RUFDQSxNQUFNLFNBQVMsR0FBRyxFQUFFLFdBQVcsR0FBRTtBQUNqQztFQUNBLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUM7QUFDL0M7RUFDQSxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksS0FBSztFQUM5QixFQUFFLElBQUksUUFBUSxHQUFHO0VBQ2pCLElBQUksTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUNwQyxJQUFJLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDcEMsSUFBSSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQ2hDLElBQUksSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUNsQyxJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDckMsSUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQ25DLElBQUksT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUNyQyxJQUFJLGFBQWEsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDM0MsSUFBRztFQUNILEVBQUUsT0FBTyxRQUFRO0VBQ2pCLEVBQUM7QUFDRDtBQUNBO0FBQ0E7RUFDQSxNQUFNQyxNQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxLQUFLO0VBQ3RDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxHQUFHLFVBQVM7QUFDakY7RUFDQSxFQUFFLE1BQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxZQUFZLENBQUMsSUFBSSxHQUFHLEdBQUU7QUFDcEQ7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFVO0VBQ3JDLEVBQUUsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQztBQUM1QztFQUNBLEVBQUUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDN0Y7RUFDQTtBQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHRCxRQUFNLENBQUMsTUFBTSxDQUFDQSxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7QUFDeEQ7QUFDQTtFQUNBLEVBQUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFHO0VBQ2xELEVBQUUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxZQUFXO0FBQ3hFO0VBQ0EsRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEdBQUcsR0FBRTtBQUMvQjtFQUNBLEVBQUUsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBSztFQUM5QyxFQUFFLElBQUksVUFBVSxHQUFHLE1BQU0sR0FBRyxTQUFTLEdBQUcsS0FBSTtBQUM1QztFQUNBLEVBQUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBQztBQUMzQztFQUNBLEVBQUUsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLEdBQUcsV0FBVTtFQUN2RCxFQUFFLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBRztFQUNqRixFQUFFLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsS0FBSTtFQUNqQyxFQUFFLElBQUksV0FBVyxHQUFHLElBQUksR0FBRyxLQUFJO0VBQy9CLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxHQUFHLEtBQUk7QUFDdEI7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLE1BQU0sR0FBRyxHQUFFO0FBQ2pCO0VBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHQSxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQ2xELElBQUksTUFBTSxLQUFLLEdBQUdBLFFBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO0VBQ2xDO0VBQ0EsSUFBSSxJQUFJLEtBQUssRUFBRTtFQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRTtFQUNyQyxRQUFRLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFDO0VBQzdCLE9BQU8sTUFBTTtFQUNiLFFBQVEsS0FBSztFQUNiLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEVBQUM7QUFDN0M7RUFDQTtFQUNBLEVBQUUsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLGNBQWE7QUFDMUM7RUFDQSxFQUFFLElBQUksUUFBUSxHQUFHLEdBQUU7QUFDbkI7RUFDQTtFQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDekMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtFQUM3RCxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDO0VBQzlCLEtBQUssTUFBTTtFQUNYLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsYUFBYSxLQUFLLGFBQWEsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFO0VBQzNFLFFBQVEsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDaEMsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLEtBQUssR0FBRyxHQUFFO0VBQ2hCLEVBQUUsSUFBSSxHQUFHLEdBQUcsR0FBRTtFQUNkLEVBQUUsSUFBSSxHQUFHLEdBQUcsR0FBRTtFQUNkLEVBQUUsSUFBSSxTQUFTLEdBQUcsR0FBRTtBQUNwQjtFQUNBLEVBQUUsS0FBSyxJQUFJLElBQUksSUFBSSxVQUFVLEVBQUU7RUFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRTtFQUNwQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDO0VBQ2pCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWM7RUFDOUIsR0FBRztBQUNIO0FBQ0E7RUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0VBQzNDLElBQUksTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBQztFQUM3QjtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxPQUFNO0FBQzFDO0VBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRTtFQUN6QixNQUFNLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBQztBQUNyQztFQUNBLE1BQU0sS0FBSyxJQUFJLElBQUksSUFBSSxVQUFVLEVBQUU7RUFDbkMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUU7RUFDeEQsUUFBUSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFDO0VBQzNCLFFBQVEsSUFBSSxJQUFJLElBQUksV0FBVyxFQUFFO0VBQ2pDLFVBQTJCLFdBQVcsQ0FBQyxLQUFLLEVBQUM7RUFDN0MsVUFFaUI7RUFDakIsWUFBWSxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsWUFBVztFQUNqRCxXQUFXO0VBQ1gsU0FBUztFQUNULFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUM7RUFDekMsUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUU7RUFDckIsVUFBVSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDMUMsVUFBVSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDMUMsU0FBUztFQUNULE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLFVBQVUsRUFBRTtBQUM5QjtFQUNBLElBQUksTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztBQUNoRDtFQUNBLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDbEMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3hDLEtBQUs7QUFDTDtFQUNBLElBQUksTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxPQUFNO0VBQzdDLElBQUksTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxPQUFNO0FBQzdDO0FBQ0E7RUFDQSxJQUFJLElBQUksV0FBVyxFQUFFO0VBQ3JCLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRyxHQUFFO0VBQ3BELE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRyxHQUFFO0VBQ3BELEtBQUs7QUFDTDtFQUNBLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUM7QUFDbkM7RUFDQSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLElBQUksV0FBVyxDQUFDLEdBQUcsSUFBSSxNQUFNLEVBQUU7RUFDL0QsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUU7RUFDekIsS0FBSztFQUNMLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxJQUFJLE1BQU0sSUFBSSxXQUFXLENBQUMsR0FBRyxJQUFJLE1BQU0sRUFBRTtFQUMvRCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRTtFQUN6QixLQUFLO0FBQ0w7RUFDQSxJQUFJLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUc7QUFDeEQ7RUFDQSxJQUFJLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0VBQ2pELElBQUksTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVM7RUFDMUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLFNBQVMsR0FBRyxZQUFXO0VBQ2xELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsR0FBRyxTQUFTLEdBQUcsWUFBVztFQUNsRDtFQUNBO0VBQ0E7RUFDQTtBQUNBO0VBQ0E7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSTtFQUN0QixNQUFNLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQy9ELE1BQU0sR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFDO0VBQy9ELE1BQUs7QUFDTDtFQUNBLElBQUksSUFBSSxPQUFPLEdBQUcsTUFBSztFQUN2QixJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO0VBQ3BFLE1BQU0sR0FBRyxPQUFPLEVBQUUsS0FBSztFQUN2QixNQUFNLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxD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QUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEdBQUU7RUFDaEMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUU7RUFDckIsSUFBSSxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDbkMsTUFBTSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBQztFQUMxRyxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBQztFQUNwRCxNQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEVBQUM7RUFDbkQsS0FBSztFQUNMLEdBQUc7RUFDSCxFQUFFLElBQUksR0FBRyxFQUFDO0VBQ1YsRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUM7RUFDN0IsRUFBQztBQUNEO0VBQ0EscUJBQXFCLENBQUMsSUFBSSxFQUFDO0FBQzNCO0FBQ0E7RUFDQSxNQUFNLFlBQVksR0FBRyxNQUFNO0VBQzNCLEVBQUUsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDcEUsRUFBRSxNQUFNLFNBQVMsR0FBRyxXQUFXLEdBQUcsV0FBVyxDQUFDLE9BQU07RUFDcEQsRUFBRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxTQUFTLEVBQUM7RUFDL0MsRUFBRSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBQztBQUN0QztFQUNBLEVBQUUsS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsU0FBUyxHQUFFO0VBQ2pDLEVBQUUsU0FBUyxDQUFDLFNBQVMsR0FBRyxVQUFTO0FBQ2pDO0VBQ0EsRUFBRSxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBQztFQUM5QyxFQUFDO0FBQ0Q7RUFDQSxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUM7QUFDbEM7QUFDQTtBQUNBO0FBQ0E7RUFDQSxNQUFNLFVBQVUsR0FBRyxZQUFZO0VBQy9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDeEIsSUFBSSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQztFQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUN4QixNQUFNRixRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU0sS0FBSyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTTtFQUN0QyxNQUFNLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU07RUFDMUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksWUFBWSxFQUFFO0VBQzdELFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFJO0VBQzVCLE9BQU8sTUFBTTtFQUNiLFFBQVEsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFLO0VBQzdCLE9BQU87RUFDUCxNQUFNQSxRQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUM7RUFDL0IsS0FBSztFQUNMLElBQUc7QUFDSDtFQUNBLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBQztFQUM3QyxFQUFDO0FBQ0Q7QUFDQTtFQUNBLFNBQVMsR0FBRyxDQUFDLElBQUk7RUFDakIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3JCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTTtFQUN4QixJQUFJLFVBQVUsR0FBRTtFQUNoQixHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUNoQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUM7RUFDMUMsR0FBRyxNQUFNO0VBQ1QsSUFBSSxTQUFTLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUU7RUFDM0M7RUFDQSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtFQUMxQixNQUFNQSxRQUFNLENBQUMsS0FBSyxHQUFFO0VBQ3BCLEtBQUssTUFBTTtFQUNYLE1BQU1BLFFBQU0sQ0FBQyxJQUFJLEdBQUU7RUFDbkIsS0FBSztFQUNMLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN2QixNQUFNLFNBQVMsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDO0VBQ3ZELEtBQUs7RUFDTCxHQUFHO0VBQ0g7Ozs7OzsifQ==
