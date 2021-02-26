<script>
  import { onDestroy, onMount } from 'svelte'

  export let type = 'line'
  export let properties = [ 'actual_temp' ]

  let canvas, worker, wsWorker, wsPort

  $: {
    if(canvas && worker) {
      // canvas.height = 400
      const offscreen = canvas.transferControlToOffscreen()
      worker.postMessage({
        canvas: offscreen, type, properties
      }, [ offscreen ])
    }
  }

  onMount(() => {
    wsWorker = new SharedWorker(new URL('./../../data/realtime/ws-worker.js', import.meta.url), { type: 'module' })
    wsPort = wsWorker.port
    wsPort.start()

    wsWorker.onerror = e => {
      console.error('wsWorker ERROR!!')
      console.error(e)
    }
    worker = new Worker(new URL('./../../data/charting/chart-worker.js', import.meta.url), { type: 'module' })
    worker.postMessage({ wsPort: wsPort }, [ wsPort ])

    // setTimeout(() => wsPort.postMessage({ command: 'close' }), 1000)
  })

  onDestroy(() => {
    worker.postMessage('close')
    worker.terminate()
  })
</script>

<canvas width='1028' height='1028' bind:this={canvas} />

<style>
  canvas {
    width: 100%;
    height: 100%;
  }
</style>