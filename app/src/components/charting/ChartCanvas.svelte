<script>
  import { onDestroy, onMount } from 'svelte'
  import { connectWS, updateBufferParams } from 'data/realtime/ws.js'
  import { drawLines, smooth } from 'data/charting/line-utils'

  export let type, properties, scale, paused, zones, position, jank

  export let stats = {}
  export let scaleData = {}
  export let width = 0

  let canvas, worker
  let offscreen = false
  let scaled = false

  export const setBufferParams = params => updateBufferParams(params)

  $: {
    if(canvas && worker) {
      if(!scaled) {
        canvas.width = canvas.offsetWidth * 1
        canvas.height = canvas.width * 6.1 / 7.8
        scaled = true
      }
      
      if(!offscreen && canvas.transferControlToOffscreen) {        
        offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ canvas: offscreen }, [ offscreen ])
      }

      let chartData = { type, properties, scale, paused, zones, position, jank }
      if(!offscreen) chartData.canvas = { width: canvas.width, height: canvas.height }
      worker.postMessage(chartData)
    }
  }

  onMount(() => {
    const connection = connectWS()
    const wsWorker = connection.worker
    const { port } = connection

    worker = new Worker('/workers/chart-worker.js')
    console.log('chart worker created')
    worker.postMessage({ wsPort: port }, [ port ])
    worker.onmessage = e => {
      if(e.data.type == 'lines') {
        drawLines(properties, canvas, e.data.lines)
      }
      if(e.data.type == 'stats') {
        stats = { ...e.data.value, offscreen }
      }
      if(e.data.type == 'scale') {
        scaleData = e.data.value
      }
    }

    // setTimeout(() => wsPort.postMessage({ command: 'close' }), 1000)
  })

  onDestroy(() => {
    worker.postMessage('close')
    worker.terminate()
  })
</script>

<canvas bind:this={canvas} bind:offsetWidth={width} />

<style>
  canvas {
    width: 100%;
    flex: 1;
    /* filter: blur(.5px); */
  }
</style>