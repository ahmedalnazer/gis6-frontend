<script>
  import CheckBox from 'components/input/CheckBox.svelte'
  import Input from 'components/input/Input.svelte'
  import { onDestroy, onMount } from 'svelte'

  export let type = 'line'
  export let maxLinePoints = 80
  export let maxZones = 150

  let rendered = {
    actual_temp: true,
    actual_percent: true,
    actual_current: true
  }

  let stats = {}
  
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
      worker.postMessage({ type, properties, scale, paused, maxLinePoints, maxZones })
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

<h3><strong>Framerate:</strong> {stats.framerate} fps</h3>

<div class='test-tools'>
  <CheckBox label='Render Temperature' bind:checked={rendered.actual_temp} />
  <CheckBox label='Render Percent' bind:checked={rendered.actual_percent} />
  <CheckBox label='Render Current' bind:checked={rendered.actual_current} />

  <Input bind:value={scale.x} label='Time window in seconds (max ~300)' />
  <Input bind:value={maxLinePoints} label='Max resolution (points per line)' />
  <Input bind:value={maxZones} label='Number of zones (max 450)' />
</div>

<div class='button' class:active={paused} on:click={() => paused = !paused}>
  {#if paused}Play{:else}Pause{/if}
</div>


<h4>Stats:</h4>
<pre>
  {JSON.stringify(stats, null, 2)}
</pre>


<style>
  canvas {
    width: 100%;
    border: 1px solid var(--gray);
  }

  .test-tools {
    margin: 40px 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
</style>