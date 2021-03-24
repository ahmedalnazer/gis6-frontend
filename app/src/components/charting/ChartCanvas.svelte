<script>
  import { onDestroy, onMount } from 'svelte'

  export let type, properties, scale, paused, maxLinePoints, zones

  export let stats = {}

  let canvas, worker, wsWorker, wsPort
  let offscreen = false

  $: {
    if(canvas && worker) {
      if(!offscreen) {
        canvas.height = canvas.width * 6.1 / 7.8
        offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ canvas: offscreen }, [ offscreen ])
      }
      worker.postMessage({ type, properties, scale, paused, maxLinePoints, zones })
    }
  }

  onMount(() => {
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
      stats = e.data
    }

    // setTimeout(() => wsPort.postMessage({ command: 'close' }), 1000)
  })

  onDestroy(() => {
    worker.postMessage('close')
    worker.terminate()
  })
</script>

<canvas width='1028' bind:this={canvas} />

<style>
  canvas {
    width: 100%;
    /* border: 1px solid var(--gray); */
    flex: 1;
  }
</style>