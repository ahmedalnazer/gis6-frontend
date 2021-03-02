<script>
  import { onDestroy, onMount } from 'svelte'

  export let type = 'line'
  export let properties = [ 'actual_temp' ]

  let canvas, worker, wsWorker, wsPort

  $: {
    if(canvas && worker) {
      canvas.height = canvas.width * 7.8 / 6.1
      const offscreen = canvas.transferControlToOffscreen()
      worker.postMessage({
        canvas: offscreen, type, properties
      }, [ offscreen ])
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
  }
</style>