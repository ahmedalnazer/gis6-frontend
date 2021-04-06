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

    const rate = bufferParams ? bufferParams.rate : 25;

    const bufferIntvl = 1000 / rate;
    const delay = Math.max(1000, bufferIntvl * 2);

    const _props = chartData.properties;
    const properties = _props.filter(x => !!x);

    let maxLinePoints = 80;

    // if(zones.length > 10) maxLinePoints = 60

    // if(zones.length > 50) maxLinePoints = 30

    // if(zones.length > 100) maxLinePoints = 10
    
    const latest = buffer$1.active[buffer$1.active.length - 1];
    let xRange = scale && scale.x ? parseInt(scale.x) : 10;

    if(isNaN(xRange)) xRange = 10;

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

    let numIntvls = 0;
    let totalIntvl = 0;

    // sample 50 frames to get average interval (mitigate effect of latency)
    for (let i = 0; i < 50; i++) {
      let a = sample[i];
      let b = sample[i + 1];
      if (a && b) {
        const intvl = b.time - a.time;
        numIntvls++;
        totalIntvl += intvl;
      }
    }

    // average samples above to determine interval between plot points (data rate)
    const intvl = totalIntvl / numIntvls;

    // determine which points should be filtered based on max points per line
    const minMSInterval = dX / maxLinePoints;

    let rendered = [];

    // filter data points to exclude ones in the excluded time intervals
    for(let i = 0; i < sample.length; i++) {
      if(i == 0 || !rendered.length || i == sample.length - 1) {
        rendered.push(sample[i]);
      } else {
        if ((sample[i].time - 1614799160000) %  minMSInterval < intvl) {
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
            const settings = getSettings(point);
            if (!settings.on) {
              y = 0;
            } else {
              y = point.temp_sp - point.actual_temp;
            }
          }
          lines[prop][z - 1].push({ x, y });
          if (y > max[prop]) max[prop] = y;
          if (y < min[prop]) min[prop] = y;
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

  const maxChunkSize = 200;

  let params = {
    rate: 25
  };

  let buffer = [];


  const tryPush = (frame) => {
    const lastFrame = buffer[buffer.length - 1];
    if(!lastFrame) {
      buffer.push(frame);
      return
    }
    const minIntvl = 1000 / params.rate;
    if(frame.time - lastFrame.time >= minIntvl) {
      buffer.push(frame);
    }
  };

  buffer.write = function ({ ts, data }) {

    // simulate 450 zones
    // data = data.concat(data).concat(data)

    const date = new Date(ts);
    const frame = { data, date, time: ts };

    // buffer.push(frame)
    tween(frame, 12);

    buffer = buffer.slice(-7500);
  };






  // utilities for testing

  const tween = (next, frames) => {

    let frameList = [];
    for (let i = 1; i < frames; i++) {
      frameList.push(i);
    }

    const { time, data } = next;
    const lastBuffer = buffer[buffer.length - 1];

    // test tweening
    if (lastBuffer) {
      for (let x of frameList) {
        let tween = [];
        for (let i = 0; i < lastBuffer.data.length; i++) {
          const last = lastBuffer.data[i];
          const current = data[i];
          if (last && current) {
            let tweened = { ...current };
            for (let prop of [ 'actual_temp', 'actual_current', 'actual_percent' ]) {
              // console.log(prop)
              const delta = (current[prop] - last[prop]) / frames;
              tweened[prop] = last[prop] + delta * x;
            }
            tween.push(tweened);
          }
        }
        const offset = 500 / frames * x;
        const updatedTS = time - 500 + offset;
        const date = new Date(updatedTS);
        setTimeout(() => tryPush({ time: updatedTS, date, data: tween }), offset);
      }
    }
    setTimeout(() => tryPush(next), 500);
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
    const framerate = Math.round(1000 / avgRender);
    renderTimes = renderTimes.slice(-50);

    postMessage({ ...stats, framerate });
  };

  setInterval(collectStats, 30 / 100);




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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnQtd29ya2VyLmpzIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9idWZmZXIuanMiLCIuLi8uLi9zcmMvZGF0YS9jaGFydGluZy9saW5lLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvbGluZS1wbG90LmpzIiwiLi4vLi4vc3JjL2RhdGEvcmVhbHRpbWUvYnVmZmVyLmpzIiwiLi4vLi4vc3JjL2RhdGEvY2hhcnRpbmcvY2hhcnQtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImxldCBidWZmZXIgPSB7XG4gIGVudHJpZXM6IFtdLFxuICBhY3RpdmU6IFtdLFxuICBwYXVzZWQ6IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5cbmJ1ZmZlci53cml0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gY29uc29sZS5sb2coJ3VwZGF0aW5nJywgZGF0YSlcbiAgYnVmZmVyLmVudHJpZXMgPSBbIC4uLmJ1ZmZlci5lbnRyaWVzLCAuLi5kYXRhIF0uc2xpY2UoLTc1MDApXG4gIGJ1ZmZlci5lbnRyaWVzLnNvcnQoKGEsIGIpID0+IGEudGltZSAtIGIudGltZSlcbiAgaWYoIWJ1ZmZlci5wYXVzZWQpIHtcbiAgICBidWZmZXIuYWN0aXZlID0gWyAuLi5idWZmZXIuZW50cmllcyBdXG4gIH1cbn1cbmJ1ZmZlci5yZXNldCA9ICgpID0+IGJ1ZmZlci5lbnRyaWVzID0gW11cbmJ1ZmZlci5wbGF5ID0gKCkgPT4gYnVmZmVyLnBhdXNlZCA9IGZhbHNlXG5idWZmZXIucGF1c2UgPSAoKSA9PiBidWZmZXIucGF1c2VkID0gdHJ1ZVxuIiwiXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKGN0eCwgcG9pbnRzLCBjb2xvciwgd2lkdGgpIHtcbiAgY3R4LnN0cm9rZVN0eWxlID0gY29sb3JcbiAgY3R4LmxpbmVXaWR0aCA9IHdpZHRoXG4gIC8vIGN0eC5zdHJva2VSZWN0KDIwLCAyMCwgMTUwLCAxMDApXG5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGlmIChwb2ludHMgPT0gdW5kZWZpbmVkIHx8IHBvaW50cy5sZW5ndGggPT0gMCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMSkge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHBvaW50cy5sZW5ndGggPT0gMikge1xuICAgIGN0eC5tb3ZlVG8ocG9pbnRzWzBdLngsIHBvaW50c1swXS55KVxuICAgIGN0eC5saW5lVG8ocG9pbnRzWzFdLngsIHBvaW50c1sxXS55KVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgY3R4Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgIC8vIGN0eC5saW5lVG8ocG9pbnRzW2ldLngsIHBvaW50c1tpXS55KVxuICAgIHZhciB4YyA9IChwb2ludHNbaV0ueCArIHBvaW50c1tpICsgMV0ueCkgLyAyXG4gICAgdmFyIHljID0gKHBvaW50c1tpXS55ICsgcG9pbnRzW2kgKyAxXS55KSAvIDJcbiAgICAvLyBjdHgubGluZVRvKHBvaW50c1tpXS54LCBwb2ludHNbaV0ueSlcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHhjLCB5YylcbiAgfVxuICBjdHgucXVhZHJhdGljQ3VydmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnksIHBvaW50c1tpICsgMV0ueCwgcG9pbnRzW2kgKyAxXS55KVxuICBjdHguc3Ryb2tlKClcbn0iLCJpbXBvcnQgYnVmZmVyIGZyb20gJy4vYnVmZmVyJ1xuaW1wb3J0IHsgc21vb3RoIH0gZnJvbSAnLi9saW5lLXV0aWxzJ1xuXG5leHBvcnQgY29uc3QgY29sb3JzID0ge1xuICAxOiAnI0ExMDNGRicsXG4gIDI6ICcjRkY5QzAzJyxcbiAgMzogJyMwM0NGRkYnLFxuICA0OiAnIzJFMDNGRidcbn1cblxuLy8gcHJvcGVydGllcyB3aGljaCBhbGxvdyBuZWdhdGl2ZSB2YWx1ZXNcbmNvbnN0IG5lZ2F0aXZlcyA9IFsgJ2RldmlhdGlvbicgXVxuXG5jb25zdCBnZXRCaXQgPSAoaW50LCBiaXQpID0+ICEhKGludCAmIDEgPDwgYml0KVxuXG5jb25zdCBnZXRTZXR0aW5ncyA9ICh6b25lKSA9PiB7XG4gIGxldCBzZXR0aW5ncyA9IHtcbiAgICBsb2NrZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAwKSxcbiAgICBzZWFsZWQ6IGdldEJpdCh6b25lLnNldHRpbmdzLCAxKSxcbiAgICBvbjogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDIpLFxuICAgIGF1dG86IGdldEJpdCh6b25lLnNldHRpbmdzLCAzKSxcbiAgICBzdGFuZGJ5OiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNCksXG4gICAgYm9vc3Q6IGdldEJpdCh6b25lLnNldHRpbmdzLCA1KSxcbiAgICB0ZXN0aW5nOiBnZXRCaXQoem9uZS5zZXR0aW5ncywgNiksXG4gICAgdGVzdF9jb21wbGV0ZTogZ2V0Qml0KHpvbmUuc2V0dGluZ3MsIDcpXG4gIH1cbiAgcmV0dXJuIHNldHRpbmdzXG59XG5cblxuXG5jb25zdCBkcmF3ID0gKGNoYXJ0RGF0YSwgbG9nU3RhdHMpID0+IHtcbiAgY29uc3QgeyBjYW52YXMsIGN0eCwgc2NhbGUsIHBhdXNlZCwgem9uZXMsIGJ1ZmZlclBhcmFtcyB9ID0gY2hhcnREYXRhXG5cbiAgY29uc3QgcmF0ZSA9IGJ1ZmZlclBhcmFtcyA/IGJ1ZmZlclBhcmFtcy5yYXRlIDogMjVcblxuICBjb25zdCBidWZmZXJJbnR2bCA9IDEwMDAgLyByYXRlXG4gIGNvbnN0IGRlbGF5ID0gTWF0aC5tYXgoMTAwMCwgYnVmZmVySW50dmwgKiAyKVxuXG4gIGNvbnN0IF9wcm9wcyA9IGNoYXJ0RGF0YS5wcm9wZXJ0aWVzXG4gIGNvbnN0IHByb3BlcnRpZXMgPSBfcHJvcHMuZmlsdGVyKHggPT4gISF4KVxuXG4gIGxldCBtYXhMaW5lUG9pbnRzID0gODBcblxuICAvLyBpZih6b25lcy5sZW5ndGggPiAxMCkgbWF4TGluZVBvaW50cyA9IDYwXG5cbiAgLy8gaWYoem9uZXMubGVuZ3RoID4gNTApIG1heExpbmVQb2ludHMgPSAzMFxuXG4gIC8vIGlmKHpvbmVzLmxlbmd0aCA+IDEwMCkgbWF4TGluZVBvaW50cyA9IDEwXG4gIFxuICBjb25zdCBsYXRlc3QgPSBidWZmZXIuYWN0aXZlW2J1ZmZlci5hY3RpdmUubGVuZ3RoIC0gMV1cbiAgbGV0IHhSYW5nZSA9IHNjYWxlICYmIHNjYWxlLnggPyBwYXJzZUludChzY2FsZS54KSA6IDEwXG5cbiAgaWYoaXNOYU4oeFJhbmdlKSkgeFJhbmdlID0gMTBcblxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGRlbGF5XG4gIGxldCB4TWF4ID0gcGF1c2VkID8gbGF0ZXN0ID8gbGF0ZXN0LnRpbWUgLSBkZWxheSAqIC4yNSA6IG5vdyA6IG5vd1xuICBsZXQgeE1pbiA9IHhNYXggLSB4UmFuZ2UgKiAxMDAwXG4gIGxldCByZW5kZXJMaW1pdCA9IHhNaW4gLSAyMDAwXG4gIGxldCBkWCA9IHhNYXggLSB4TWluXG5cbiAgLy8gbGV0IHNhbXBsZSA9IGJ1ZmZlci5hY3RpdmUuZmlsdGVyKHggPT4geC50aW1lID4gcmVuZGVyTGltaXQpXG5cbiAgbGV0IHNhbXBsZSA9IFtdXG5cbiAgZm9yIChsZXQgaSA9IGJ1ZmZlci5hY3RpdmUubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgIGNvbnN0IGZyYW1lID0gYnVmZmVyLmFjdGl2ZVtpXVxuICAgIC8vIGNvbnNvbGUubG9nKGZyYW1lICYmIGZyYW1lLnRpbWUsIHJlbmRlckxpbWl0KVxuICAgIGlmIChmcmFtZSkge1xuICAgICAgaWYgKGZyYW1lLnRpbWUgPj0gcmVuZGVyTGltaXQpIHtcbiAgICAgICAgc2FtcGxlLnVuc2hpZnQoZnJhbWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHhTY2FsZSA9IGNhbnZhcy53aWR0aCAvICh4TWF4IC0geE1pbilcblxuICBsZXQgbnVtSW50dmxzID0gMFxuICBsZXQgdG90YWxJbnR2bCA9IDBcblxuICAvLyBzYW1wbGUgNTAgZnJhbWVzIHRvIGdldCBhdmVyYWdlIGludGVydmFsIChtaXRpZ2F0ZSBlZmZlY3Qgb2YgbGF0ZW5jeSlcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA1MDsgaSsrKSB7XG4gICAgbGV0IGEgPSBzYW1wbGVbaV1cbiAgICBsZXQgYiA9IHNhbXBsZVtpICsgMV1cbiAgICBpZiAoYSAmJiBiKSB7XG4gICAgICBjb25zdCBpbnR2bCA9IGIudGltZSAtIGEudGltZVxuICAgICAgbnVtSW50dmxzKytcbiAgICAgIHRvdGFsSW50dmwgKz0gaW50dmxcbiAgICB9XG4gIH1cblxuICAvLyBhdmVyYWdlIHNhbXBsZXMgYWJvdmUgdG8gZGV0ZXJtaW5lIGludGVydmFsIGJldHdlZW4gcGxvdCBwb2ludHMgKGRhdGEgcmF0ZSlcbiAgY29uc3QgaW50dmwgPSB0b3RhbEludHZsIC8gbnVtSW50dmxzXG5cbiAgLy8gZGV0ZXJtaW5lIHdoaWNoIHBvaW50cyBzaG91bGQgYmUgZmlsdGVyZWQgYmFzZWQgb24gbWF4IHBvaW50cyBwZXIgbGluZVxuICBjb25zdCBtaW5NU0ludGVydmFsID0gZFggLyBtYXhMaW5lUG9pbnRzXG5cbiAgbGV0IHJlbmRlcmVkID0gW11cblxuICAvLyBmaWx0ZXIgZGF0YSBwb2ludHMgdG8gZXhjbHVkZSBvbmVzIGluIHRoZSBleGNsdWRlZCB0aW1lIGludGVydmFsc1xuICBmb3IobGV0IGkgPSAwOyBpIDwgc2FtcGxlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoaSA9PSAwIHx8ICFyZW5kZXJlZC5sZW5ndGggfHwgaSA9PSBzYW1wbGUubGVuZ3RoIC0gMSkge1xuICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgoc2FtcGxlW2ldLnRpbWUgLSAxNjE0Nzk5MTYwMDAwKSAlICBtaW5NU0ludGVydmFsIDwgaW50dmwpIHtcbiAgICAgICAgcmVuZGVyZWQucHVzaChzYW1wbGVbaV0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuZGVyZWQucmV2ZXJzZSgpXG5cbiAgbGV0IGxpbmVzID0ge31cbiAgbGV0IG1heCA9IHt9XG4gIGxldCBtaW4gPSB7fVxuICBsZXQgYXV0b1NjYWxlID0ge31cblxuICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICBsaW5lc1twcm9wXSA9IFtdXG4gICAgbWF4W3Byb3BdID0gMFxuICAgIG1pbltwcm9wXSA9IDk5OTk5OTk5OTk5OTk5XG4gIH1cblxuXG4gIGZvcihsZXQgaSA9IDA7IGkgPCByZW5kZXJlZC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGZyYW1lID0gcmVuZGVyZWRbaV1cbiAgICBcbiAgICBjb25zdCB4ID0gKGZyYW1lLnRpbWUgLSB4TWluKSAqIHhTY2FsZVxuXG4gICAgZm9yIChsZXQgeiBvZiB6b25lcykge1xuICAgICAgY29uc3QgcG9pbnQgPSBmcmFtZS5kYXRhW3ogLSAxXVxuXG4gICAgICBmb3IgKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCFsaW5lc1twcm9wXVt6IC0gMV0pIGxpbmVzW3Byb3BdW3ogLSAxXSA9IFtdXG4gICAgICAgIGxldCB5ID0gcG9pbnRbcHJvcF1cbiAgICAgICAgaWYgKHByb3AgPT0gJ2RldmlhdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGdldFNldHRpbmdzKHBvaW50KVxuICAgICAgICAgIGlmICghc2V0dGluZ3Mub24pIHtcbiAgICAgICAgICAgIHkgPSAwXG4gICAgICAgICAgfSBlbHNlIGlmIChzZXR0aW5ncy5tYW51YWwpIHtcbiAgICAgICAgICAgIHkgPSBwb2ludC5tYW51YWxfc3AgLSBwb2ludC5hY3R1YWxfcGVyY2VudFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5ID0gcG9pbnQudGVtcF9zcCAtIHBvaW50LmFjdHVhbF90ZW1wXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxpbmVzW3Byb3BdW3ogLSAxXS5wdXNoKHsgeCwgeSB9KVxuICAgICAgICBpZiAoeSA+IG1heFtwcm9wXSkgbWF4W3Byb3BdID0geVxuICAgICAgICBpZiAoeSA8IG1pbltwcm9wXSkgbWluW3Byb3BdID0geVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG5cbiAgICBjb25zdCBzY2FsZVBhcmFtcyA9IHNjYWxlLnkgJiYgc2NhbGUueVtwcm9wXVxuXG4gICAgaWYoIW5lZ2F0aXZlcy5pbmNsdWRlcyhwcm9wKSkge1xuICAgICAgbWluW3Byb3BdID0gTWF0aC5tYXgobWluW3Byb3BdLCAxKVxuICAgIH1cblxuICAgIGNvbnN0IG1pbkF1dG8gPSBzY2FsZVBhcmFtcy5taW4gPT0gJ2F1dG8nXG4gICAgY29uc3QgbWF4QXV0byA9IHNjYWxlUGFyYW1zLm1heCA9PSAnYXV0bydcblxuXG4gICAgaWYgKHNjYWxlUGFyYW1zKSB7XG4gICAgICBpZiAoIW1pbkF1dG8pIG1pbltwcm9wXSA9IHNjYWxlUGFyYW1zLm1pbiAqIDEwXG4gICAgICBpZiAoIW1heEF1dG8pIG1heFtwcm9wXSA9IHNjYWxlUGFyYW1zLm1heCAqIDEwXG4gICAgfVxuXG4gICAgY29uc3QgciA9IG1heFtwcm9wXSAtIG1pbltwcm9wXVxuXG4gICAgaWYoc2NhbGVQYXJhbXMubWF4ID09ICdhdXRvJyAmJiBzY2FsZVBhcmFtcy5taW4gIT0gJ2F1dG8nKSB7XG4gICAgICBtYXhbcHJvcF0gKz0gciAvIDEwXG4gICAgfVxuICAgIGlmKHNjYWxlUGFyYW1zLm1pbiA9PSAnYXV0bycgJiYgc2NhbGVQYXJhbXMubWF4ICE9ICdhdXRvJykge1xuICAgICAgbWluW3Byb3BdIC09IHIgLyAxMFxuICAgIH1cbiAgICAvLyBpZiAobWF4W3Byb3BdIDwgbWluW3Byb3BdICsgMTApIHtcbiAgICAvLyAgIG1heFtwcm9wXSA9IG1pbltwcm9wXSArIDEwXG4gICAgLy8gfVxuICAgIFxuXG4gICAgLy8gZW5zdXJlIHJvdW5kIG51bWJlcnMgYXJlIHVzZWQgZm9yIHRoZSBzY2FsZVxuICAgIGNvbnN0IGV2ZW4gPSBpID0+IHtcbiAgICAgIGlmKG1pbkF1dG8pIG1pbltwcm9wXSA9IC1pICsgaSAqIE1hdGguY2VpbChtaW5bcHJvcF0gLyBpKVxuICAgICAgaWYobWF4QXV0bykgbWF4W3Byb3BdID0gaSArIGkgKiBNYXRoLmZsb29yKG1heFtwcm9wXSAvIGkpXG4gICAgfVxuXG4gICAgbGV0IG1hdGNoZWQgPSBmYWxzZVxuICAgIGZvcihsZXQgeCBvZiBbIDEwLCAxMDAsIDIwMCwgNTAwLCAxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMCBdKSB7XG4gICAgICBpZihtYXRjaGVkKSBicmVha1xuICAgICAgZm9yKGxldCB5IG9mIFsgMSwgMiwgNCBdKSB7XG4gICAgICAgIGNvbnN0IGJhc2UgPSB4ICogeVxuICAgICAgICBpZihyIDwgYmFzZSkge1xuICAgICAgICAgIGV2ZW4oYmFzZSAvIDUpXG4gICAgICAgICAgbWF0Y2hlZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYoIW1hdGNoZWQpIHtcbiAgICAgIGV2ZW4oMjAwMDApXG4gICAgfVxuICAgIFxuICAgIGF1dG9TY2FsZVtwcm9wXSA9IGNhbnZhcy5oZWlnaHQgLyAobWF4W3Byb3BdIC0gbWluW3Byb3BdKVxuICB9XG5cblxuICAvLyBzaW1wbGlmaWVkIGxpbmVzIGZvciByZW5kZXJpbmdcbiAgbGV0IHJlbmRlcmVkTGluZXMgPSB7fVxuXG4gIC8vIHRyYWNrIGFsbCByZW5kZXJlZCB2YWx1ZXMgcGVyIHByb3BlcnR5XG4gIGxldCB5VmFsdWVzID0ge31cblxuICBsZXQgdG90YWxQb2ludHMgPSAwXG5cblxuICAvLyBsb29wIHRocm91Z2ggcG9pbnRzIGFuZCBkZXRlcm1pbmUgd2hpY2ggb25lcyBhcmUgY3JpdGljYWwgdG8gZ2VvbWV0cnlcbiAgZm9yKGxldCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICByZW5kZXJlZExpbmVzW3Byb3BdID0gW11cbiAgICB5VmFsdWVzW3Byb3BdID0ge1xuICAgICAgdG90YWw6IDAsXG4gICAgICB0b3RhbFBvaW50czogMFxuICAgIH1cblxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYobGluZXNbcHJvcF1baV0pIHtcbiAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXSA9IFtdXG5cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBsaW5lc1twcm9wXVtpXS5sZW5ndGg7IHArKykge1xuICAgICAgICAgIGxldCBwb2ludCA9IGxpbmVzW3Byb3BdW2ldW3BdXG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbCArPSBwb2ludC55XG4gICAgICAgICAgeVZhbHVlc1twcm9wXS50b3RhbFBvaW50cyArPSAxXG4gICAgICAgICAgcG9pbnQueSA9IHBhcnNlSW50KGNhbnZhcy5oZWlnaHQgLSAocG9pbnQueSAtIG1pbltwcm9wXSkgKiBhdXRvU2NhbGVbcHJvcF0pXG4gICAgICAgICAgcmVuZGVyZWRMaW5lc1twcm9wXVtpXS5wdXNoKHBvaW50KVxuICAgICAgICAgIHRvdGFsUG9pbnRzKytcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxpbmVDb2xvcnMgPSB7XG4gICAgW19wcm9wc1swXV06IGNvbG9yc1sxXSxcbiAgICBbX3Byb3BzWzFdXTogY29sb3JzWzJdLFxuICAgIFtfcHJvcHNbMl1dOiBjb2xvcnNbM10sXG4gICAgW19wcm9wc1szXV06IGNvbG9yc1s0XVxuICB9XG5cbiAgLy8gY2xlYXIgY2FudmFzIGZvciBuZXcgZnJhbWVcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpXG5cbiAgbGV0IGF2ZyA9IHt9XG4gIGZvcihsZXQgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgYXZnW3Byb3BdID0geVZhbHVlc1twcm9wXS50b3RhbCAvIHlWYWx1ZXNbcHJvcF0udG90YWxQb2ludHNcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgcmVuZGVyZWRMaW5lc1twcm9wXS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocmVuZGVyZWRMaW5lc1twcm9wXVtpXSkge1xuICAgICAgICBjb25zdCBsaW5lID0gcmVuZGVyZWRMaW5lc1twcm9wXVtpXVxuICAgICAgICBzbW9vdGgoY3R4LCBsaW5lLCBsaW5lQ29sb3JzW3Byb3BdLCAxKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxvZ1N0YXRzKHsgdG90YWxQb2ludHMsIG1heCwgbWluLCBhdmcsIHBsb3RGaWxsZWQ6IHNhbXBsZS5sZW5ndGggPCBidWZmZXIuYWN0aXZlLmxlbmd0aCwgeE1heCwgeE1pbiB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCBkcmF3IiwiZXhwb3J0IGNvbnN0IG1heENodW5rU2l6ZSA9IDIwMFxuXG5sZXQgcGFyYW1zID0ge1xuICByYXRlOiAyNVxufVxuXG5sZXQgYnVmZmVyID0gW11cblxuXG5jb25zdCB0cnlQdXNoID0gKGZyYW1lKSA9PiB7XG4gIGNvbnN0IGxhc3RGcmFtZSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV1cbiAgaWYoIWxhc3RGcmFtZSkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICAgIHJldHVyblxuICB9XG4gIGNvbnN0IG1pbkludHZsID0gMTAwMCAvIHBhcmFtcy5yYXRlXG4gIGlmKGZyYW1lLnRpbWUgLSBsYXN0RnJhbWUudGltZSA+PSBtaW5JbnR2bCkge1xuICAgIGJ1ZmZlci5wdXNoKGZyYW1lKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJ1ZmZlclxuXG5idWZmZXIud3JpdGUgPSBmdW5jdGlvbiAoeyB0cywgZGF0YSB9KSB7XG5cbiAgLy8gc2ltdWxhdGUgNDUwIHpvbmVzXG4gIC8vIGRhdGEgPSBkYXRhLmNvbmNhdChkYXRhKS5jb25jYXQoZGF0YSlcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUodHMpXG4gIGNvbnN0IGZyYW1lID0geyBkYXRhLCBkYXRlLCB0aW1lOiB0cyB9XG5cbiAgLy8gYnVmZmVyLnB1c2goZnJhbWUpXG4gIHR3ZWVuKGZyYW1lLCAxMilcblxuICBidWZmZXIgPSBidWZmZXIuc2xpY2UoLTc1MDApXG59XG5cblxubGV0IGludGVydmFscyA9IHt9XG5sZXQgbGF0ZXN0ID0ge31cbmxldCBlYXJsaWVzdCA9IHt9XG5sZXQgbmVlZHNSZXNldCA9IHt9XG5cbmV4cG9ydCBjb25zdCBidWZmZXJDb21tYW5kcyA9IChwb3J0LCBlLCBpZCkgPT4ge1xuICBjb25zdCB7IGRhdGEgfSA9IGVcbiAgXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3JlYWRCdWZmZXInKSB7XG5cbiAgICAvLyBzZW5kIGRhdGEgaW4gYmF0Y2hlcywgbGltaXRpbmcgbWF4IHRvIGF2b2lkIE9PTSB3aGVuIHNlcmlhbGl6aW5nIHRvXG4gICAgLy8gcGFzcyBiZXR3ZWVuIHRocmVhZHNcbiAgICBjb25zdCBzZW5kQ2h1bmsgPSAoKSA9PiB7XG4gICAgICBjb25zdCByZXNldEJ1ZmZlciA9ICgpID0+IHtcbiAgICAgICAgbGF0ZXN0W2lkXSA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gMV0gJiYgYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXS50aW1lXG4gICAgICAgIGVhcmxpZXN0W2lkXSA9IGxhdGVzdFtpZF0gKyAxXG4gICAgICAgIG5lZWRzUmVzZXRbaWRdID0gZmFsc2VcbiAgICAgIH1cbiAgICAgIGlmICghbGF0ZXN0W2lkXSAmJiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIHJlc2V0QnVmZmVyKClcbiAgICAgIH1cblxuICAgICAgaWYobmVlZHNSZXNldFtpZF0pIHtcbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSgncmVzZXQnKVxuICAgICAgICByZXNldEJ1ZmZlcigpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgXG4gICAgICBpZihsYXRlc3RbaWRdKSB7XG4gICAgICAgIGNvbnN0IG5ld2VzdCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRpbWUgPiBsYXRlc3RbaWRdKVxuICAgICAgICBjb25zdCBiYWNrRmlsbCA9IGJ1ZmZlci5maWx0ZXIoeCA9PiB4LnRpbWUgPCBlYXJsaWVzdFtpZF0pLnNsaWNlKC0obWF4Q2h1bmtTaXplIC0gbmV3ZXN0Lmxlbmd0aCkpXG4gICAgICAgIGNvbnN0IHVwZGF0ZSA9IGJhY2tGaWxsLmNvbmNhdChuZXdlc3QpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJhY2tGaWxsLmxlbmd0aCwgbmV3ZXN0Lmxlbmd0aClcbiAgICAgICAgaWYgKHVwZGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBsYXRlc3RFbnRyeSA9IHVwZGF0ZVt1cGRhdGUubGVuZ3RoIC0gMV1cbiAgICAgICAgICBjb25zdCBmaXJzdEVudHJ5ID0gdXBkYXRlWzBdXG4gICAgICAgICAgbGF0ZXN0W2lkXSA9IGxhdGVzdEVudHJ5LnRpbWVcbiAgICAgICAgICBpZihmaXJzdEVudHJ5LnRpbWUgPCBlYXJsaWVzdFtpZF0pIGVhcmxpZXN0W2lkXSA9IGZpcnN0RW50cnkudGltZVxuICAgICAgICAgIHBvcnQucG9zdE1lc3NhZ2UoeyB1cGRhdGUsIHBhcmFtcyB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhzaXplT2YoWyAuLi5idWZmZXIgXSkpXG4gICAgfVxuXG5cblxuICAgIGludGVydmFsc1tpZF0gPSBzZXRJbnRlcnZhbChzZW5kQ2h1bmssIDUwMClcbiAgfVxuXG4gIGlmIChkYXRhLmNvbW1hbmQgPT0gJ3NldEJ1ZmZlclBhcmFtcycpIHtcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBwYXJhbXMnLCBkYXRhLnBhcmFtcylcbiAgICBwYXJhbXMgPSB7IC4uLnBhcmFtcywgLi4uZGF0YS5wYXJhbXMgfHwge319XG4gICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIDApXG4gICAgZm9yKGxldCBrZXkgb2YgT2JqZWN0LmtleXMobmVlZHNSZXNldCkpIHtcbiAgICAgIG5lZWRzUmVzZXRba2V5XSA9IHRydWVcbiAgICB9XG4gIH1cblxuICBpZiAoZGF0YS5jb21tYW5kID09ICdjbG9zZScpIHtcbiAgICBjbGVhckludGVydmFsKGludGVydmFsc1tpZF0pXG4gICAgbGF0ZXN0W2lkXSA9IDBcbiAgfVxufVxuXG5cblxuXG5cblxuLy8gdXRpbGl0aWVzIGZvciB0ZXN0aW5nXG5cbmNvbnN0IHR3ZWVuID0gKG5leHQsIGZyYW1lcykgPT4ge1xuXG4gIGxldCBmcmFtZUxpc3QgPSBbXVxuICBmb3IgKGxldCBpID0gMTsgaSA8IGZyYW1lczsgaSsrKSB7XG4gICAgZnJhbWVMaXN0LnB1c2goaSlcbiAgfVxuXG4gIGNvbnN0IHsgdGltZSwgZGF0YSB9ID0gbmV4dFxuICBjb25zdCBsYXN0QnVmZmVyID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSAxXVxuXG4gIC8vIHRlc3QgdHdlZW5pbmdcbiAgaWYgKGxhc3RCdWZmZXIpIHtcbiAgICBmb3IgKGxldCB4IG9mIGZyYW1lTGlzdCkge1xuICAgICAgbGV0IHR3ZWVuID0gW11cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEJ1ZmZlci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBsYXN0QnVmZmVyLmRhdGFbaV1cbiAgICAgICAgY29uc3QgY3VycmVudCA9IGRhdGFbaV1cbiAgICAgICAgaWYgKGxhc3QgJiYgY3VycmVudCkge1xuICAgICAgICAgIGxldCB0d2VlbmVkID0geyAuLi5jdXJyZW50IH1cbiAgICAgICAgICBmb3IgKGxldCBwcm9wIG9mIFsgJ2FjdHVhbF90ZW1wJywgJ2FjdHVhbF9jdXJyZW50JywgJ2FjdHVhbF9wZXJjZW50JyBdKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wKVxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSAoY3VycmVudFtwcm9wXSAtIGxhc3RbcHJvcF0pIC8gZnJhbWVzXG4gICAgICAgICAgICB0d2VlbmVkW3Byb3BdID0gbGFzdFtwcm9wXSArIGRlbHRhICogeFxuICAgICAgICAgIH1cbiAgICAgICAgICB0d2Vlbi5wdXNoKHR3ZWVuZWQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG9mZnNldCA9IDUwMCAvIGZyYW1lcyAqIHhcbiAgICAgIGNvbnN0IHVwZGF0ZWRUUyA9IHRpbWUgLSA1MDAgKyBvZmZzZXRcbiAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh1cGRhdGVkVFMpXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRyeVB1c2goeyB0aW1lOiB1cGRhdGVkVFMsIGRhdGUsIGRhdGE6IHR3ZWVuIH0pLCBvZmZzZXQpXG4gICAgfVxuICB9XG4gIHNldFRpbWVvdXQoKCkgPT4gdHJ5UHVzaChuZXh0KSwgNTAwKVxufVxuXG5cblxuY29uc3QgdHlwZVNpemVzID0ge1xuICBcInVuZGVmaW5lZFwiOiAoKSA9PiAwLFxuICBcImJvb2xlYW5cIjogKCkgPT4gNCxcbiAgXCJudW1iZXJcIjogKCkgPT4gOCxcbiAgXCJzdHJpbmdcIjogaXRlbSA9PiAyICogaXRlbS5sZW5ndGgsXG4gIFwib2JqZWN0XCI6IGl0ZW0gPT4gIWl0ZW0gPyAwIDogT2JqZWN0XG4gICAgLmtleXMoaXRlbSlcbiAgICAucmVkdWNlKCh0b3RhbCwga2V5KSA9PiBzaXplT2Yoa2V5KSArIHNpemVPZihpdGVtW2tleV0pICsgdG90YWwsIDApXG59XG5cbmNvbnN0IHNpemVPZiA9IHZhbHVlID0+IHR5cGVTaXplc1t0eXBlb2YgdmFsdWVdKHZhbHVlKSIsImltcG9ydCByZW5kZXJMaW5lIGZyb20gJy4vbGluZS1wbG90J1xuaW1wb3J0IGJ1ZmZlciBmcm9tICcuL2J1ZmZlcidcbmltcG9ydCB7IG1heENodW5rU2l6ZSB9IGZyb20gJy4uL3JlYWx0aW1lL2J1ZmZlcidcblxuXG5jb25zdCByZW5kZXJlcnMgPSB7XG4gICdsaW5lJzogcmVuZGVyTGluZVxufVxuXG5sZXQgY2hhcnREYXRhID0ge1xuICBjYW52YXM6IG51bGwsXG4gIGN0eDogbnVsbCxcbiAgdHlwZTogJycsXG4gIHByb3BlcnRpZXM6IFtdLFxuICBzY2FsZToge1xuICAgIHg6IDEwLFxuICAgIHk6ICdhdXRvJ1xuICB9XG59XG5cbmxldCBwb3J0XG5cblxubGV0IHN0YXRzID0ge31cbmNvbnN0IGxvZ1N0YXRzID0gcyA9PiBzdGF0cyA9IHsgLi4uc3RhdHMsIC4uLnMgfVxuXG5cbmxldCByZW5kZXJUaW1lcyA9IFtdXG5cbmxldCBsYXN0ID0gMFxuY29uc3QgZHJhdyA9ICgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gIGlmIChjaGFydERhdGEuY3R4KSB7XG4gICAgaWYgKHJlbmRlcmVyc1tjaGFydERhdGEudHlwZV0pIHtcbiAgICAgIHJlbmRlcmVyc1tjaGFydERhdGEudHlwZV0oY2hhcnREYXRhLCBsb2dTdGF0cylcbiAgICAgIHJlbmRlclRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsYXN0KVxuICAgIH1cbiAgfVxuICBsYXN0ID0gdFxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdylcbn1cblxucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpXG5cblxuY29uc3QgY29sbGVjdFN0YXRzID0gKCkgPT4ge1xuXG4gIGNvbnN0IHRvdGFsUmVuZGVyID0gcmVuZGVyVGltZXMucmVkdWNlKCh0LCB0b3RhbCkgPT4gdG90YWwgKyB0LCAwKVxuICBjb25zdCBhdmdSZW5kZXIgPSB0b3RhbFJlbmRlciAvIHJlbmRlclRpbWVzLmxlbmd0aFxuICBjb25zdCBmcmFtZXJhdGUgPSBNYXRoLnJvdW5kKDEwMDAgLyBhdmdSZW5kZXIpXG4gIHJlbmRlclRpbWVzID0gcmVuZGVyVGltZXMuc2xpY2UoLTUwKVxuXG4gIHBvc3RNZXNzYWdlKHsgLi4uc3RhdHMsIGZyYW1lcmF0ZSB9KVxufVxuXG5zZXRJbnRlcnZhbChjb2xsZWN0U3RhdHMsIDMwIC8gMTAwKVxuXG5cblxuXG5jb25zdCBpbml0aWFsaXplID0gYXN5bmMgKCkgPT4ge1xuICBwb3J0Lm9ubWVzc2FnZSA9IGUgPT4ge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gZVxuICAgIGlmKGRhdGEgPT0gJ3Jlc2V0Jykge1xuICAgICAgYnVmZmVyLnJlc2V0KClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuYnVmZmVyUGFyYW1zID0gZGF0YS5wYXJhbXNcbiAgICAgIGNoYXJ0RGF0YS5idWZmZXJQYXJhbXMgPSBkYXRhLnBhcmFtc1xuICAgICAgaWYgKGRhdGEudXBkYXRlICYmIGRhdGEudXBkYXRlLmxlbmd0aCA9PSBtYXhDaHVua1NpemUpIHtcbiAgICAgICAgc3RhdHMubG9hZGluZyA9IHRydWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRzLmxvYWRpbmcgPSBmYWxzZVxuICAgICAgfVxuICAgICAgYnVmZmVyLndyaXRlKGRhdGEudXBkYXRlKVxuICAgIH1cbiAgfVxuXG4gIHBvcnQucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAncmVhZEJ1ZmZlcicgfSlcbn1cblxuXG5vbm1lc3NhZ2UgPSBlID0+IHtcbiAgaWYgKGUuZGF0YS53c1BvcnQpIHtcbiAgICBwb3J0ID0gZS5kYXRhLndzUG9ydFxuICAgIGluaXRpYWxpemUoKVxuICB9IGVsc2UgaWYgKGUuZGF0YSA9PSAnY2xvc2UnKSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjbG9zZScgfSlcbiAgfSBlbHNlIHtcbiAgICBjaGFydERhdGEgPSB7IC4uLmNoYXJ0RGF0YSwgLi4uZS5kYXRhIH1cbiAgICAvLyBjb25zb2xlLmxvZygndXBkYXRpbmcgZGF0YScsIGNoYXJ0RGF0YSlcbiAgICBpZiAoY2hhcnREYXRhLnBhdXNlZCkge1xuICAgICAgYnVmZmVyLnBhdXNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyLnBsYXkoKVxuICAgIH1cbiAgICBpZiAoZS5kYXRhLmNhbnZhcykge1xuICAgICAgY2hhcnREYXRhLmN0eCA9IGNoYXJ0RGF0YS5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG4gICAgfVxuICB9XG59Il0sIm5hbWVzIjpbImJ1ZmZlciIsImRyYXciLCJyZW5kZXJMaW5lIl0sIm1hcHBpbmdzIjoiOzs7RUFBQSxJQUFJQSxRQUFNLEdBQUc7RUFDYixFQUFFLE9BQU8sRUFBRSxFQUFFO0VBQ2IsRUFBRSxNQUFNLEVBQUUsRUFBRTtFQUNaLEVBQUUsTUFBTSxFQUFFLEtBQUs7RUFDZixFQUFDO0FBR0Q7QUFDQTtBQUNBQSxVQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxFQUFFO0VBQzlCO0VBQ0EsRUFBRUEsUUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUdBLFFBQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUM7RUFDOUQsRUFBRUEsUUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBQztFQUNoRCxFQUFFLEdBQUcsQ0FBQ0EsUUFBTSxDQUFDLE1BQU0sRUFBRTtFQUNyQixJQUFJQSxRQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBR0EsUUFBTSxDQUFDLE9BQU8sR0FBRTtFQUN6QyxHQUFHO0VBQ0gsRUFBQztBQUNEQSxVQUFNLENBQUMsS0FBSyxHQUFHLE1BQU1BLFFBQU0sQ0FBQyxPQUFPLEdBQUcsR0FBRTtBQUN4Q0EsVUFBTSxDQUFDLElBQUksR0FBRyxNQUFNQSxRQUFNLENBQUMsTUFBTSxHQUFHLE1BQUs7QUFDekNBLFVBQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTUEsUUFBTSxDQUFDLE1BQU0sR0FBRzs7RUNsQjlCLFNBQVMsTUFBTSxD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USxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7RUFDeEMsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHO0FBQ0g7RUFDQSxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO0FBQzlCO0VBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO0FBQ2hEO0VBQ0EsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUNsQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUM7RUFDeEMsS0FBSztBQUNMO0VBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxJQUFJLE9BQU07RUFDN0MsSUFBSSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxJQUFJLE9BQU07QUFDN0M7QUFDQTtFQUNBLElBQUksSUFBSSxXQUFXLEVBQUU7RUFDckIsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsR0FBRyxHQUFHLEdBQUU7RUFDcEQsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsR0FBRyxHQUFHLEdBQUU7RUFDcEQsS0FBSztBQUNMO0VBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBQztBQUNuQztFQUNBLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxJQUFJLE1BQU0sSUFBSSxXQUFXLENBQUMsR0FBRyxJQUFJLE1BQU0sRUFBRTtFQUMvRCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxD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RCxVQUFVLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDdkMsVUFBVSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxFQUFDO0VBQ3hDLFVBQVUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsSUFBSSxFQUFDO0VBQ3hDLFVBQVUsS0FBSyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQztFQUNyRixVQUFVLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDO0VBQzVDLFVBQVUsV0FBVyxHQUFFO0VBQ3ZCLFNBQVM7RUFDVCxPQUFPO0VBQ1AsS0FBSztFQUNMLEdBQUc7QUFDSDtFQUNBLEVBQUUsTUFBTSxVQUFVLEdBQUc7RUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztFQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7RUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQzFCLElBQUc7QUFDSDtFQUNBO0VBQ0EsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFDO0FBQ2xEO0VBQ0EsRUFBRSxJQUFJLEdBQUcsR0FBRyxHQUFFO0VBQ2QsRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLFVBQVUsRUFBRTtFQUM5QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFXO0VBQy9ELElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDeEQsTUFBTSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtFQUNqQyxRQUFRLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUM7RUFDM0MsUUFBUSxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQzlDLE9BQU87RUFDUCxLQUFLO0VBQ0wsR0FBRztBQUNIO0VBQ0EsRUFBRSxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUdBLFFBQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBQztFQUN4Rzs7RUMxUU8sTUFBTSxZQUFZLEdBQUcsSUFBRztBQUMvQjtFQUNBLElBQUksTUFBTSxHQUFHO0VBQ2IsRUFBRSxJQUFJLEVBQUUsRUFBRTtFQUNWLEVBQUM7QUFDRDtFQUNBLElBQUksTUFBTSxHQUFHLEdBQUU7QUFDZjtBQUNBO0VBQ0EsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEtBQUs7RUFDM0IsRUFBRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUM7RUFDN0MsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFO0VBQ2pCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDdEIsSUFBSSxNQUFNO0VBQ1YsR0FBRztFQUNILEVBQUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFJO0VBQ3JDLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLElBQUksUUFBUSxFQUFFO0VBQzlDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUM7RUFDdEIsR0FBRztFQUNILEVBQUM7QUFHRDtFQUNBLE1BQU0sQ0FBQyxLQUFLLEdBQUcsVUFBVSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRTtBQUN2QztFQUNBO0VBQ0E7QUFDQTtFQUNBLEVBQUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFDO0VBQzNCLEVBQUUsTUFBTSxLQUFLLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUU7QUFDeEM7RUFDQTtFQUNBLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUM7QUFDbEI7RUFDQSxFQUFFLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFDO0VBQzlCLEVBQUM7QUFrRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0E7QUFDQTtFQUNBLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sS0FBSztBQUNoQztFQUNBLEVBQUUsSUFBSSxTQUFTLEdBQUcsR0FBRTtFQUNwQixFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7RUFDbkMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQztFQUNyQixHQUFHO0FBQ0g7RUFDQSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsS0FBSTtFQUM3QixFQUFFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBQztBQUM5QztFQUNBO0VBQ0EsRUFBRSxJQUFJLFVBQVUsRUFBRTtFQUNsQixJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFO0VBQzdCLE1BQU0sSUFBSSxLQUFLLEdBQUcsR0FBRTtFQUNwQixNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtFQUN2RCxRQUFRLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDO0VBQ3ZDLFFBQVEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBQztFQUMvQixRQUFRLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtFQUM3QixVQUFVLElBQUksT0FBTyxHQUFHLEVBQUUsR0FBRyxPQUFPLEdBQUU7RUFDdEMsVUFBVSxLQUFLLElBQUksSUFBSSxJQUFJLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLEVBQUU7RUFDbEY7RUFDQSxZQUFZLE1BQU0sS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFNO0VBQy9ELFlBQVksT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFBQztFQUNsRCxXQUFXO0VBQ1gsVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBQztFQUM3QixTQUFTO0VBQ1QsT0FBTztFQUNQLE1BQU0sTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sR0FBRyxFQUFDO0VBQ3JDLE1BQU0sTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxPQUFNO0VBQzNDLE1BQU0sTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFDO0VBQ3RDLE1BQU0sVUFBVSxDQUFDLE1BQU0sT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFDO0VBQy9FLEtBQUs7RUFDTCxHQUFHO0VBQ0gsRUFBRSxVQUFVLENBQUMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFDO0VBQ3RDOztFQzFJQSxNQUFNLFNBQVMsR0FBRztFQUNsQixFQUFFLE1BQU0sRUFBRUUsTUFBVTtFQUNwQixFQUFDO0FBQ0Q7RUFDQSxJQUFJLFNBQVMsR0FBRztFQUNoQixFQUFFLE1BQU0sRUFBRSxJQUFJO0VBQ2QsRUFBRSxHQUFHLEVBQUUsSUFBSTtFQUNYLEVBQUUsSUFBSSxFQUFFLEVBQUU7RUFDVixFQUFFLFVBQVUsRUFBRSxFQUFFO0VBQ2hCLEVBQUUsS0FBSyxFQUFFO0VBQ1QsSUFBSSxDQUFDLEVBQUUsRUFBRTtFQUNULElBQUksQ0FBQyxFQUFFLE1BQU07RUFDYixHQUFHO0VBQ0gsRUFBQztBQUNEO0VBQ0EsSUFBSSxLQUFJO0FBQ1I7QUFDQTtFQUNBLElBQUksS0FBSyxHQUFHLEdBQUU7RUFDZCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUU7QUFDaEQ7QUFDQTtFQUNBLElBQUksV0FBVyxHQUFHLEdBQUU7QUFDcEI7RUFDQSxJQUFJLElBQUksR0FBRyxFQUFDO0VBQ1osTUFBTSxJQUFJLEdBQUcsTUFBTTtFQUNuQixFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxHQUFFO0VBQ2hDLEVBQUUsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFO0VBQ3JCLElBQUksSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ25DLE1BQU0sU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFDO0VBQ3BELE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBQztFQUNuRCxLQUFLO0VBQ0wsR0FBRztFQUNILEVBQUUsSUFBSSxHQUFHLEVBQUM7RUFDVixFQUFFLHFCQUFxQixDQUFDLElBQUksRUFBQztFQUM3QixFQUFDO0FBQ0Q7RUFDQSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUM7QUFDM0I7QUFDQTtFQUNBLE1BQU0sWUFBWSxHQUFHLE1BQU07QUFDM0I7RUFDQSxFQUFFLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFDO0VBQ3BFLEVBQUUsTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLFdBQVcsQ0FBQyxPQUFNO0VBQ3BELEVBQUUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsU0FBUyxFQUFDO0VBQ2hELEVBQUUsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUM7QUFDdEM7RUFDQSxFQUFFLFdBQVcsQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFDO0VBQ3RDLEVBQUM7QUFDRDtFQUNBLFdBQVcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxHQUFHLEdBQUcsRUFBQztBQUNuQztBQUNBO0FBQ0E7QUFDQTtFQUNBLE1BQU0sVUFBVSxHQUFHLFlBQVk7RUFDL0IsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSTtFQUN4QixJQUFJLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFDO0VBQ3RCLElBQUksR0FBRyxJQUFJLElBQUksT0FBTyxFQUFFO0VBQ3hCLE1BQU1GLFFBQU0sQ0FBQyxLQUFLLEdBQUU7RUFDcEIsS0FBSyxNQUFNO0VBQ1gsTUFBTSxLQUFLLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFNO0VBQ3RDLE1BQU0sU0FBUyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTTtFQUMxQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxZQUFZLEVBQUU7RUFDN0QsUUFBUSxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUk7RUFDNUIsT0FBTyxNQUFNO0VBQ2IsUUFBUSxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQUs7RUFDN0IsT0FBTztFQUNQLE1BQU1BLFFBQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQztFQUMvQixLQUFLO0VBQ0wsSUFBRztBQUNIO0VBQ0EsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxFQUFDO0VBQzdDLEVBQUM7QUFDRDtBQUNBO0VBQ0EsU0FBUyxHQUFHLENBQUMsSUFBSTtFQUNqQixFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDckIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFNO0VBQ3hCLElBQUksVUFBVSxHQUFFO0VBQ2hCLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksT0FBTyxFQUFFO0VBQ2hDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBQztFQUMxQyxHQUFHLE1BQU07RUFDVCxJQUFJLFNBQVMsR0FBRyxFQUFFLEdBQUcsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRTtFQUMzQztFQUNBLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO0VBQzFCLE1BQU1BLFFBQU0sQ0FBQyxLQUFLLEdBQUU7RUFDcEIsS0FBSyxNQUFNO0VBQ1gsTUFBTUEsUUFBTSxDQUFDLElBQUksR0FBRTtFQUNuQixLQUFLO0VBQ0wsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0VBQ3ZCLE1BQU0sU0FBUyxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUM7RUFDdkQsS0FBSztFQUNMLEdBQUc7RUFDSDs7Ozs7OyJ9
