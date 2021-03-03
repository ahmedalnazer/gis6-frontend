<script>
  import CheckBox from 'components/input/CheckBox.svelte'
  import Input from 'components/input/Input.svelte'
  import { onDestroy, onMount } from 'svelte'

  export let type = 'line'

  let rendered = {
    actual_temp: true,
    actual_percent: true,
    actual_current: false
  }
  
  $: properties = Object.keys(rendered).filter(x => rendered[x])

  // export let properties = [ 'actual_temp', 'actual_percent', 'actual_current' ]

  let canvas, worker, wsWorker, wsPort
  let offscreen = false
  let paused = false

  let scale = {
    y: 'auto',
    x: 10
  }

  $: {
    if(canvas && worker) {
      if(!offscreen) {
        canvas.height = canvas.width * 6.1 / 7.8
        offscreen = canvas.transferControlToOffscreen()
        worker.postMessage({ canvas: offscreen }, [ offscreen ])
      }
      worker.postMessage({ type, properties, scale, paused })
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
    worker.onMessage = e => {
      console.log(e)
    }

    // setTimeout(() => wsPort.postMessage({ command: 'close' }), 1000)
  })

  onDestroy(() => {
    worker.postMessage('close')
    worker.terminate()
  })
</script>

<canvas width='1028' bind:this={canvas} />

<Input bind:value={scale.x} label='time scale' />
<CheckBox label='Temp' bind:checked={rendered.actual_temp} />
<CheckBox label='Percent' bind:checked={rendered.actual_percent} />
<CheckBox label='Current' bind:checked={rendered.actual_current} />

<div class='button' class:active={paused} on:click={() => paused = !paused}>
  {#if paused}Play{:else}Pause{/if}
</div>


<style>
  canvas {
    width: 100%;
    border: 1px solid var(--gray);
  }
</style>