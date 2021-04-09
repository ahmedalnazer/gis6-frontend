<script>
  import { onDestroy, onMount } from 'svelte'

  export let type, properties, scale, paused, zones, position

  export let stats = {}
  export let scaleData = {}

  let canvas, worker, localWsWorker, wsWorker, wsPort
  let offscreen = false

  export const setBufferParams = params => {
    localWsWorker.port.postMessage({ command: 'setBufferParams', params })
  }

  $: {
    if(canvas && worker) {
      if(!offscreen) {
        canvas.width = canvas.offsetWidth * 1
        canvas.height = canvas.width * 6.1 / 7.8
        offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ canvas: offscreen }, [ offscreen ])
      }
      worker.postMessage({ type, properties, scale, paused, zones, position })
    }
  }

  onMount(() => {
    localWsWorker = new SharedWorker('/workers/ws-worker.js')
    localWsWorker.port.start()
    wsWorker = new SharedWorker('/workers/ws-worker.js')
    wsPort = wsWorker.port
    wsPort.start()

    wsWorker.onerror = e => {
      console.error('wsWorker ERROR!!')
      console.error(e)
    }
    worker = new Worker('/workers/chart-worker.js')
    console.log('chart worker created')
    worker.postMessage({ wsPort: wsPort }, [ wsPort ])
    worker.onmessage = e => {
      if(e.data.type == 'stats') {
        stats = e.data.value
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

<canvas bind:this={canvas} />

<style>
  canvas {
    width: 100%;
    flex: 1;
    /* filter: blur(.5px); */
  }
</style>