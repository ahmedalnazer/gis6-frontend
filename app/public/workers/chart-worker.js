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
    const { canvas, ctx, scale, paused, zones, bufferParams } = chartData;

    const rate = bufferParams ? bufferParams.rate : 10;

    const _props = chartData.properties;
    const properties = _props.filter(x => !!x);

    let maxLinePoints = 100;

    // if(zones.length > 10) maxLinePoints = 60

    // if(zones.length > 50) maxLinePoints = 30

    // if(zones.length > 100) maxLinePoints = 10
    
    const latest = buffer$1.active[buffer$1.active.length - 1];
    let xRange = scale && scale.x ? parseInt(scale.x) : 10;

    if(isNaN(xRange)) xRange = 10;

    const delay = Math.max(1000, 10 * xRange);

    const now = new Date().getTime() - delay;
    let xMax = paused ? latest ? latest.time - delay * .25 : now : now;
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
      // if (max[prop] < min[prop] + 10) {
      //   max[prop] = min[prop] + 10
      // }
      

      // ensure round numbers are used for the scale
      const even = i => {
        if(minAuto) min[prop] = -i + i * Math.ceil(min[prop] / i);
        if(maxAuto) max[prop] = i + i * Math.floor(max[prop] / i);
      };

      let matched = false;
      for(let x of [ 10, 100, 200, 500, 1000, 2000, 5000, 10000 ]) {
        if(matched) break
        for(let y of [ 1, 2, 4 ]) {
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


    // loop through points and determine which ones are critical to geometry
    for(let prop of properties) {
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
            point.y = parseInt(canvas.height - (point.y - min[prop]) * autoScale[prop]);
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
        postMessage({ type: 'xScale', value: { xMax: stats.xMax, xMin: stats.xMin }});
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgc21vb3RoIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG5leHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cblxuXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgem9uZXMsIGJ1ZmZlclBhcmFtcyB9ID0gY2hhcnREYXRhXG5cbiAgY29uc3QgcmF0ZSA9IGJ1ZmZlclBhcmFtcyA/IGJ1ZmZlclBhcmFtcy5yYXRlIDogMTBcblxuICBjb25zdCBfcHJvcHMgPSBjaGFydERhdGEucHJvcGVydGllc1xuICBjb25zdCBwcm9wZXJ0aWVzID0gX3Byb3BzLmZpbHRlcih4ID0+ICEheClcblxuICBsZXQgbWF4TGluZVBvaW50cyA9IDEwMFxuXG4gIC8vIGlmKHpvbmVzLmxlbmd0aCA+IDEwKSBtYXhMaW5lUG9pbnRzID0gNjBcblxuICAvLyBpZih6b25lcy5sZW5ndGggPiA1MCkgbWF4TGluZVBvaW50cyA9IDMwXG5cbiAgLy8gaWYoem9uZXMubGVuZ3RoID4gMTAwKSBtYXhMaW5lUG9pbnRzID0gMTBcbiAgXG4gIGNvbnN0IGxhdGVzdCA9IGJ1ZmZlci5hY3RpdmVbYnVmZmVyLmFjdGl2ZS5sZW5ndGggLSAxXVxuICBsZXQgeFJhbmdlID0gc2NhbGUgJiYgc2NhbGUueCA/IHBhcnNlSW50KHNjYWxlLngpIDogMTBcblxuICBpZihpc05hTih4UmFuZ2UpKSB4UmFuZ2UgPSAxMFxuXG4gIGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMTAwMCwgMTAgKiB4UmFuZ2UpXG5cbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBkZWxheVxuICBsZXQgeE1heCA9IHBhdXNlZCA/IGxhdGVzdCA/IGxhdGVzdC50aW1lIC0gZGVsYXkgKiAuMjUgOiBub3cgOiBub3dcbiAgbGV0IHhNaW4gPSB4TWF4IC0geFJhbmdlICogMTAwMFxuICBsZXQgcmVuZGVyTGltaXQgPSB4TWluIC0gMjAwMFxuICBsZXQgZFggPSB4TWF4IC0geE1pblxuXG4gIC8vIGxldCBzYW1wbGUgPSBidWZmZXIuYWN0aXZlLmZpbHRlcih4ID0+IHgudGltZSA+IHJlbmRlckxpbWl0KVxuXG4gIGxldCBzYW1wbGUgPSBbXVxuXG4gIGZvciAobGV0IGkgPSBidWZmZXIuYWN0aXZlLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBmcmFtZSA9IGJ1ZmZlci5hY3RpdmVbaV1cbiAgICAvLyBjb25zb2xlLmxvZyhmcmFtZSAmJiBmcmFtZS50aW1lLCByZW5kZXJMaW1pdClcbiAgICBpZiAoZnJhbWUpIHtcbiAgICAgIGlmIChmcmFtZS50aW1lID49IHJlbmRlckxpbWl0KSB7XG4gICAgICAgIHNhbXBsZS51bnNoaWZ0KGZyYW1lKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCB4U2NhbGUgPSBjYW52YXMud2lkdGggLyAoeE1heCAtIHhNaW4pXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgbGV0IHJlbmRlcmVkID0gW11cblxuICAvLyBmaWx0ZXIgZGF0YSBwb2ludHMgdG8gZXhjbHVkZSBvbmVzIGluIHRoZSBleGNsdWRlZCB0aW1lIGludGVydmFsc1xuICBmb3IobGV0IGkgPSAwOyBpIDwgc2FtcGxlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoaSA9PSAwIHx8ICFyZW5kZXJlZC5sZW5ndGggfHwgaSA9PSBzYW1wbGUubGVuZ3RoIC0gMSkge1xuICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgoc2FtcGxlW2ldLnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlICBtaW5NU0ludGVydmFsIDwgMjAwMCAvIHJhdGUpIHtcbiAgICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gIH1cblxuXG4gIGZvcihsZXQgaSA9IDA7IGkgPCByZW5kZXJlZC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaV1cbiAgICBcbiAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFsaW5lc1twcm9wXVt6IC0gMV0pIGxpbmVzW3Byb3BdW3ogLSAxXSA9IFtdXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSB9KVxuICAgICAgICBpZih4IDwgeE1heCkge1xuICAgICAgICAgIGlmICh5ID4gbWF4W3Byb3BdKSBtYXhbcHJvcF0gPSB5XG4gICAgICAgICAgaWYgKHkgPCBtaW5bcHJvcF0pIG1pbltwcm9wXSA9IHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG5cbiAgICBjb25zdCBzY2FsZVBhcmFtcyA9IHNjYWxlLnkgJiYgc2NhbGUueVtwcm9wXVxuXG4gICAgaWYoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgICAgbWluW3Byb3BdID0gTWF0aC5tYXgobWluW3Byb3BdLCAxKVxuICAgIH1cblxuICAgIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gICAgY29uc3QgbWF4QXV0byA9IHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bydcblxuXG4gICAgaWYgKHNjYWxlUGFyYW1zKSB7XG4gICAgICBpZiAoIW1pbkF1dG8pIG1pbltwcm9wXSA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gICAgICBpZiAoIW1heEF1dG8pIG1heFtwcm9wXSA9IHNjYWxlUGFyYW1zLm1heCAqIDEwXG4gICAgfVxuXG4gICAgY29uc3QgciA9IG1heFtwcm9wXSAtIG1pbltwcm9wXVxuXG4gICAgaWYoc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5taW4gIT0gJ2F1dG8nKSB7XG4gICAgICBtYXhbcHJvcF0gKz0gciAvIDEwXG4gICAgfVxuICAgIGlmKHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWF4ICE9ICdhdXRvJykge1xuICAgICAgbWluW3Byb3BdIC09IHIgLyAxMFxuICAgIH1cbiAgICAvLyBpZiAobWF4W3Byb3BdIDwgbWluW3Byb3BdICsgMTApIHtcbiAgICAvLyAgIG1heFtwcm9wXSA9IG1pbltwcm9wXSArIDEwXG4gICAgLy8gfVxuICAgIFxuXG4gICAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICAgIGNvbnN0IGV2ZW4gPSBpID0+IHtcbiAgICAgIGlmKG1pbkF1dG8pIG1pbltwcm9wXSA9IC1pICsgaSAqIE1hdGguY2VpbChtaW5bcHJvcF0gLyBpKVxuICAgICAgaWYobWF4QXV0bykgbWF4W3Byb3BdID0gaSArIGkgKiBNYXRoLmZsb29yKG1heFtwcm9wXSAvIGkpXG4gICAgfVxuXG4gICAgbGV0IG1hdGNoZWQgPSBmYWxzZVxuICAgIGZvcihsZXQgeCBvZiBbIDEwLCAxMDAsIDIwMCwgNTAwLCAxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMCBdKSB7XG4gICAgICBpZihtYXRjaGVkKSBicmVha1xuICAgICAgZm9yKGxldCB5IG9mIFsgMSwgMiwgNCBdKSB7XG4gICAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgICBpZihyIDwgYmFzZSkge1xuICAgICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgICAgbWF0Y2hlZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoIW1hdGNoZWQpIHtcbiAgICAgIGV2ZW4oMjAwMDApXG4gICAgfVxuICAgIFxuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuICB9XG5cblxuICAvLyBzaW1wbGlmaWVkIGxpbmVzIGZvciByZW5kZXJpbmdcbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIC8vIHRyYWNrIGFsbCByZW5kZXJlZCB2YWx1ZXMgcGVyIHByb3BlcnR5XG4gIGxldCB5VmFsdWVzID0ge31cblxuICBsZXQgdG90YWxQb2ludHMgPSAwXG5cblxuICAvLyBsb29wIHRocm91Z2ggcG9pbnRzIGFuZCBkZXRlcm1pbmUgd2hpY2ggb25lcyBhcmUgY3JpdGljYWwgdG8gZ2VvbWV0cnlcbiAgZm9yKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYobGluZXNbcHJvcF1baV0pIHtcbiAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXSA9IFtdXG5cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBsaW5lc1twcm9wXVtpXS5sZW5ndGg7IHArKykge1xuICAgICAgICAgIGxldCBwb2ludCA9IGxpbmVzW3Byb3BdW2ldW3BdXG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbCArPSBwb2ludC55XG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgICAgcG9pbnQueSA9IHBhcnNlSW50KGNhbnZhcy5oZWlnaHQgLSAocG9pbnQueSAtIG1pbltwcm9wXSkgKiBhdXRvU2NhbGVbcHJvcF0pXG4gICAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXS5wdXNoKHBvaW50KVxuICAgICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW19wcm9wc1swXV06IGNvbG9yc1sxXSxcbiAgICBbX3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtfcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW19wcm9wc1szXV06IGNvbG9yc1s0XVxuICB9XG5cbiAgLy8gY2xlYXIgY2FudmFzIGZvciBuZXcgZnJhbWVcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXG5cbiAgbGV0IGF2ZyA9IHt9XG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgYXZnW3Byb3BdID0geVZhbHVlc1twcm9wXS50b3RhbCAvIHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHNcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgcmVuZGVyZWRMaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXVtpXSkge1xuICAgICAgICBjb25zdCBsaW5lID0gcmVuZGVyZWRMaW5lc1twcm9wXVtpXVxuICAgICAgICBzbW9vdGgoY3R4LCBsaW5lLCBsaW5lQ29sb3JzW3Byb3BdLCAxKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQ6IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aCwgeE1heCwgeE1pbiB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBkcmF3IiwiZXhwb3J0IGNvbnN0IG1heENodW5rU2l6ZSA9IDEwMFxuXG5sZXQgcGFyYW1zID0ge1xuICByYXRlOiAxMFxufVxuXG5sZXQgYnVmZmVyID0gW11cblxuXG4vLyBlbnN1cmUgYnVmZmVyIGlzIG5ldmVyIGZpbGxlZCBmYXN0ZXIgdGhhbiB0aGUgc3BlY2lmaWVkIHJhdGVcbmNvbnN0IHRyeVB1c2ggPSAoZnJhbWUpID0+IHtcbiAgZnJhbWUudHMgPSBmcmFtZS50aW1lLmdldFRpbWUoKVxuICBjb25zdCBsYXN0RnJhbWUgPSBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdXG4gIGlmKCFsYXN0RnJhbWUpIHtcbiAgICBidWZmZXIucHVzaChmcmFtZSlcbiAgICByZXR1cm5cbiAgfVxuICAvLyBtaW4gaW50ZXJ2YWwgaXMgbWluIG1zIGJldHdlZW4gZnJhbWVzIHdpdGggNW1zIHBhZGRpbmdcbiAgY29uc3QgbWluSW50dmwgPSAxMDAwIC8gcGFyYW1zLnJhdGUgKyA1XG4gIGlmKGZyYW1lLnRpbWUgLSBsYXN0RnJhbWUudGltZSA+PSBtaW5JbnR2bCkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbiAoeyB0cywgZGF0YSB9KSB7XG5cbiAgLy8gc2ltdWxhdGUgNDUwIHpvbmVzXG4gIC8vIGRhdGEgPSBkYXRhLmNvbmNhdChkYXRhKS5jb25jYXQoZGF0YSlcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUodHMpXG4gIGNvbnN0IGZyYW1lID0geyBkYXRhLCBkYXRlLCB0aW1lOiB0cyB9XG5cbiAgdHJ5UHVzaChmcmFtZSlcbiAgLy8gdHdlZW4oZnJhbWUsIDEyKVxuXG4gIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgtNzUwMClcbn1cblxuXG5sZXQgaW50ZXJ2YWxzID0ge31cbmxldCBsYXRlc3QgPSB7fVxubGV0IGVhcmxpZXN0ID0ge31cbmxldCBuZWVkc1Jlc2V0ID0ge31cblxuZXhwb3J0IGNvbnN0IGJ1ZmZlckNvbW1hbmRzID0gKHBvcnQsIGUsIGlkKSA9PiB7XG4gIGNvbnN0IHsgZGF0YSB9ID0gZVxuICBcbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAncmVhZEJ1ZmZlcicpIHtcblxuICAgIC8vIHNlbmQgZGF0YSBpbiBiYXRjaGVzLCBsaW1pdGluZyBtYXggdG8gYXZvaWQgT09NIHdoZW4gc2VyaWFsaXppbmcgdG9cbiAgICAvLyBwYXNzIGJldHdlZW4gdGhyZWFkc1xuICAgIGNvbnN0IHNlbmRDaHVuayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc2V0QnVmZmVyID0gKCkgPT4ge1xuICAgICAgICBsYXRlc3RbaWRdID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXSAmJiBidWZmZXJbYnVmZmVyLmxlbmd0aCAtIDFdLnRzXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRzID4gbGF0ZXN0W2lkXSlcbiAgICAgICAgY29uc3QgYmFja0ZpbGwgPSBidWZmZXIuZmlsdGVyKHggPT4geC50cyA8IGVhcmxpZXN0W2lkXSkuc2xpY2UoLShtYXhDaHVua1NpemUgLSBuZXdlc3QubGVuZ3RoKSlcbiAgICAgICAgY29uc3QgdXBkYXRlID0gYmFja0ZpbGwuY29uY2F0KG5ld2VzdClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG4gICAgaW50ZXJ2YWxzW2lkXSA9IHNldEludGVydmFsKHNlbmRDaHVuaywgMjAwKVxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnc2V0QnVmZmVyUGFyYW1zJykge1xuICAgIGxldCByZXNldCA9IGZhbHNlXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgcGFyYW1zJywgZGF0YS5wYXJhbXMpXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YS5wYXJhbXMpKSB7XG4gICAgICBpZihkYXRhLnBhcmFtc1trZXldICE9IHBhcmFtc1trZXldKSB7XG4gICAgICAgIHJlc2V0ID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgaWYocmVzZXQpIHtcbiAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAwKVxuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKG5lZWRzUmVzZXQpKSB7XG4gICAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICAgIH1cbiAgICB9IFxuICB9XG5cbiAgaWYgKGRhdGEuY29tbWFuZCA9PSAnY2xvc2UnKSB7XG4gICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbHNbaWRdKVxuICAgIGxhdGVzdFtpZF0gPSAwXG4gIH1cbn1cblxuXG5cblxuXG5cbi8vIHV0aWxpdGllcyBmb3IgdGVzdGluZ1xuXG5jb25zdCB0d2VlbiA9IChuZXh0LCBmcmFtZXMpID0+IHtcblxuICBsZXQgZnJhbWVMaXN0ID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBmcmFtZXM7IGkrKykge1xuICAgIGZyYW1lTGlzdC5wdXNoKGkpXG4gIH1cblxuICBjb25zdCB7IHRpbWUsIGRhdGEgfSA9IG5leHRcbiAgY29uc3QgbGFzdEJ1ZmZlciA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cblxuICAvLyB0ZXN0IHR3ZWVuaW5nXG4gIGlmIChsYXN0QnVmZmVyKSB7XG4gICAgZm9yIChsZXQgeCBvZiBmcmFtZUxpc3QpIHtcbiAgICAgIGxldCB0d2VlbiA9IFtdXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RCdWZmZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBsYXN0ID0gbGFzdEJ1ZmZlci5kYXRhW2ldXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBkYXRhW2ldXG4gICAgICAgIGlmIChsYXN0ICYmIGN1cnJlbnQpIHtcbiAgICAgICAgICBsZXQgdHdlZW5lZCA9IHsgLi4uY3VycmVudCB9XG4gICAgICAgICAgZm9yIChsZXQgcHJvcCBvZiBbICdhY3R1YWxfdGVtcCcsICdhY3R1YWxfY3VycmVudCcsICdhY3R1YWxfcGVyY2VudCcgXSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJvcClcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gKGN1cnJlbnRbcHJvcF0gLSBsYXN0W3Byb3BdKSAvIGZyYW1lc1xuICAgICAgICAgICAgdHdlZW5lZFtwcm9wXSA9IGxhc3RbcHJvcF0gKyBkZWx0YSAqIHhcbiAgICAgICAgICB9XG4gICAgICAgICAgdHdlZW4ucHVzaCh0d2VlbmVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvZmZzZXQgPSA1MDAgLyBmcmFtZXMgKiB4XG4gICAgICBjb25zdCB1cGRhdGVkVFMgPSB0aW1lIC0gNTAwICsgb2Zmc2V0XG4gICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodXBkYXRlZFRTKVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKHsgdGltZTogbmV3IERhdGUodXBkYXRlZFRTKSwgdHM6IHVwZGF0ZWRUUywgZGF0ZSwgZGF0YTogdHdlZW4gfSksIG9mZnNldClcbiAgICB9XG4gIH1cbiAgc2V0VGltZW91dCgoKSA9PiB0cnlQdXNoKG5leHQpLCA1MDApXG59XG5cblxuXG5jb25zdCB0eXBlU2l6ZXMgPSB7XG4gIFwidW5kZWZpbmVkXCI6ICgpID0+IDAsXG4gIFwiYm9vbGVhblwiOiAoKSA9PiA0LFxuICBcIm51bWJlclwiOiAoKSA9PiA4LFxuICBcInN0cmluZ1wiOiBpdGVtID0+IDIgKiBpdGVtLmxlbmd0aCxcbiAgXCJvYmplY3RcIjogaXRlbSA9PiAhaXRlbSA/IDAgOiBPYmplY3RcbiAgICAua2V5cyhpdGVtKVxuICAgIC5yZWR1Y2UoKHRvdGFsLCBrZXkpID0+IHNpemVPZihrZXkpICsgc2l6ZU9mKGl0ZW1ba2V5XSkgKyB0b3RhbCwgMClcbn1cblxuY29uc3Qgc2l6ZU9mID0gdmFsdWUgPT4gdHlwZVNpemVzW3R5cGVvZiB2YWx1ZV0odmFsdWUpIiwiaW1wb3J0IHJlbmRlckxpbmUgZnJvbSAnLi9saW5lLXBsb3QnXG5pbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgbWF4Q2h1bmtTaXplIH0gZnJvbSAnLi4vcmVhbHRpbWUvYnVmZmVyJ1xuXG5cbmNvbnN0IHJlbmRlcmVycyA9IHtcbiAgJ2xpbmUnOiByZW5kZXJMaW5lXG59XG5cbmxldCBjaGFydERhdGEgPSB7XG4gIGNhbnZhczogbnVsbCxcbiAgY3R4OiBudWxsLFxuICB0eXBlOiAnJyxcbiAgcHJvcGVydGllczogW10sXG4gIHNjYWxlOiB7XG4gICAgeDogMTAsXG4gICAgeTogJ2F1dG8nXG4gIH1cbn1cblxubGV0IHBvcnRcblxuXG5sZXQgc3RhdHMgPSB7fVxuY29uc3QgbG9nU3RhdHMgPSBzID0+IHN0YXRzID0geyAuLi5zdGF0cywgLi4ucyB9XG5cblxubGV0IHJlbmRlclRpbWVzID0gW11cblxubGV0IGxhc3QgPSAwXG5jb25zdCBkcmF3ID0gKCkgPT4ge1xuICBjb25zdCB0ID0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgaWYgKGNoYXJ0RGF0YS5jdHgpIHtcbiAgICBpZiAocmVuZGVyZXJzW2NoYXJ0RGF0YS50eXBlXSkge1xuICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlOiAneFNjYWxlJywgdmFsdWU6IHsgeE1heDogc3RhdHMueE1heCwgeE1pbjogc3RhdHMueE1pbiB9fSlcbiAgICAgIHJlbmRlcmVyc1tjaGFydERhdGEudHlwZV0oY2hhcnREYXRhLCBsb2dTdGF0cylcbiAgICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICAgIH1cbiAgfVxuICBsYXN0ID0gdFxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpXG5cblxuY29uc3QgY29sbGVjdFN0YXRzID0gKCkgPT4ge1xuICBjb25zdCB0b3RhbFJlbmRlciA9IHJlbmRlclRpbWVzLnJlZHVjZSgodCwgdG90YWwpID0+IHRvdGFsICsgdCwgMClcbiAgY29uc3QgYXZnUmVuZGVyID0gdG90YWxSZW5kZXIgLyByZW5kZXJUaW1lcy5sZW5ndGhcbiAgY29uc3QgZnJhbWVyYXRlID0gTWF0aC5jZWlsKDEwMDAgLyBhdmdSZW5kZXIpXG4gIHJlbmRlclRpbWVzID0gcmVuZGVyVGltZXMuc2xpY2UoLTUwKVxuXG4gIHN0YXRzID0geyAuLi5zdGF0cywgZnJhbWVyYXRlIH1cbiAgY2hhcnREYXRhLmZyYW1lcmF0ZSA9IGZyYW1lcmF0ZVxuXG4gIHBvc3RNZXNzYWdlKHsgdHlwZTogJ3N0YXRzJywgdmFsdWU6IHN0YXRzIH0pXG59XG5cbnNldEludGVydmFsKGNvbGxlY3RTdGF0cywgMyAvIDEwMClcblxuXG5cblxuY29uc3QgaW5pdGlhbGl6ZSA9IGFzeW5jICgpID0+IHtcbiAgcG9ydC5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgICBpZihkYXRhID09ICdyZXNldCcpIHtcbiAgICAgIGJ1ZmZlci5yZXNldCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLmJ1ZmZlclBhcmFtcyA9IGRhdGEucGFyYW1zXG4gICAgICBjaGFydERhdGEuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGlmIChkYXRhLnVwZGF0ZSAmJiBkYXRhLnVwZGF0ZS5sZW5ndGggPT0gbWF4Q2h1bmtTaXplKSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSB0cnVlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0cy5sb2FkaW5nID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGJ1ZmZlci53cml0ZShkYXRhLnVwZGF0ZSlcbiAgICB9XG4gIH1cblxuICBwb3J0LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ3JlYWRCdWZmZXInIH0pXG59XG5cblxub25tZXNzYWdlID0gZSA9PiB7XG4gIGlmIChlLmRhdGEud3NQb3J0KSB7XG4gICAgcG9ydCA9IGUuZGF0YS53c1BvcnRcbiAgICBpbml0aWFsaXplKClcbiAgfSBlbHNlIGlmIChlLmRhdGEgPT0gJ2Nsb3NlJykge1xuICAgIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xvc2UnIH0pXG4gIH0gZWxzZSB7XG4gICAgY2hhcnREYXRhID0geyAuLi5jaGFydERhdGEsIC4uLmUuZGF0YSB9XG4gICAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nIGRhdGEnLCBjaGFydERhdGEpXG4gICAgaWYgKGNoYXJ0RGF0YS5wYXVzZWQpIHtcbiAgICAgIGJ1ZmZlci5wYXVzZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlci5wbGF5KClcbiAgICB9XG4gICAgaWYgKGUuZGF0YS5jYW52YXMpIHtcbiAgICAgIGNoYXJ0RGF0YS5jdHggPSBjaGFydERhdGEuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJidWZmZXIiLCJkcmF3IiwicmVuZGVyTGluZSJdLCJtYXBwaW5ncyI6Ijs7O0VBQUEsSUFBSUEsUUFBTSxHQUFHO0VBQ2IsRUFBRSxPQUFPLEVBQUUsRUFBRTtFQUNiLEVBQUUsTUFBTSxFQUFFLEVBQUU7RUFDWixFQUFFLE1BQU0sRUFBRSxLQUFLO0VBQ2YsRUFBQztBQUdEO0FBQ0E7QUFDQUEsVUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksRUFBRTtFQUM5QjtFQUNBLEVBQUVBLFFBQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHQSxRQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQzlELEVBQUVBLFFBQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDaEQsRUFBRSxHQUFHLENBQUNBLFFBQU0sQ0FBQyxNQUFNLEVBQUU7RUFDckIsSUFBSUEsUUFBTSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEdBQUU7RUFDekMsR0FBRztFQUNILEVBQUM7QUFDREEsVUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNQSxRQUFNLENBQUMsT0FBTyxHQUFHLEdBQUU7QUFDeENBLFVBQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFLO0FBQ3pDQSxVQUFNLENBQUMsS0FBSyxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxNQUFNLEdBQUc7O0VDbEI5QixTQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEtB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QUFTLENBQUMsV0FBVTtFQUNyQyxFQUFFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDNUM7RUFDQSxFQUFFLElBQUksYUFBYSxHQUFHLElBQUc7QUFDekI7RUFDQTtBQUNBO0VBQ0E7QUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHRCxRQUFNLENBQUMsTUFBTSxDQUFDQSxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7RUFDeEQsRUFBRSxJQUFJLE1BQU0sR0FBRyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUU7QUFDeEQ7RUFDQSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sR0FBRyxHQUFFO0FBQy9CO0VBQ0EsRUFBRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsTUFBTSxFQUFDO0FBQzNDO0VBQ0EsRUFBRSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLE1BQUs7RUFDMUMsRUFBRSxJQUFJLElBQUksR0FBRyxNQUFNLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBRztFQUNwRSxFQUFFLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxNQUFNLEdBQUcsS0FBSTtFQUNqQyxFQUFFLElBQUksV0FBVyxHQUFHLElBQUksR0FBRyxLQUFJO0VBQy9CLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxHQUFHLEtBQUk7QUFDdEI7RUFDQTtBQUNBO0VBQ0EsRUFBRSxJQUFJLE1BQU0sR0FBRyxHQUFFO0FBQ2pCO0VBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHQSxRQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0s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
