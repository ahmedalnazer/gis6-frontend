<script>
  import CheckBox from 'components/input/CheckBox.svelte'
  import Input from 'components/input/Input.svelte'
  import ChartCanvas from './ChartCanvas.svelte'
  import Scale from './Scale.svelte'

  export let type = 'line'
  export let properties = [ 'actual_temp', 'actual_percent', 'actual_current' ]
  export let maxLinePoints = 80
  export let maxZones = 50

  $: totalZones = maxZones

  $: rendered = {
    actual_temp: properties.includes('actual_temp'),
    actual_percent: properties.includes('actual_percent'),
    actual_current: properties.includes('actual_current')
  }

  let stats = {}

  let paused = false

  let scale = {
    y: 'auto',
    x: 10
  }
</script>

<div class='chart'>
  <div class='scales'>
    {#if properties[0]}
      <Scale property={properties[0]} {stats} />
    {/if}
    {#if properties[2]}
      <Scale property={properties[2]} {stats} />
    {/if}
  </div>

  <div class='canvas'>
    <ChartCanvas bind:stats {...{ properties, paused, type, scale, maxLinePoints, maxZones }} />
    <div class='stats'>
      <p><strong>Framerate:</strong> {stats.framerate} fps</p>
      <p><strong>Points:</strong> {stats.totalPoints}</p>
      <p><strong>Zones:</strong> {totalZones}</p>
      <p><strong>Lines:</strong> {totalZones * properties.length}</p>
    </div>
  </div>

  <div class='scales'>
    {#if properties[1]}
      <Scale property={properties[1]} {stats} />
    {/if}
    {#if properties[3]}
      <Scale property={properties[3]} {stats} />
    {/if}
  </div>
</div>

<style lang="scss">
  .chart {
    display: flex;
  }
  .canvas {
    position: relative;
    .stats {
      position: absolute;
      top: 0;
      right: 0;
      background: rgba(0,0, 0, .5);
      color: white;
      padding: 4px 8px;
      p {
        margin: 0;
        padding: 0;
      }
    }
  }
  .scales {
    display: flex;
  }
  .test-tools {
    margin: 40px 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
</style>


<!-- <div class='test-tools'>
  <CheckBox label='Render Temperature' bind:checked={rendered.actual_temp} />
  <CheckBox label='Render Percent' bind:checked={rendered.actual_percent} />
  <CheckBox label='Render Current' bind:checked={rendered.actual_current} />

  <Input bind:value={scale.x} label='Time window in seconds (max ~300)' />
  <Input bind:value={maxLinePoints} label='Max resolution (points per line)' />
  <Input bind:value={maxZones} label='Number of zones (max 450)' />
</div>

<div class='button' class:active={paused} on:click={() => paused = !paused}>
  {#if paused}Play{:else}Pause{/if}
</div> -->


<h4>Stats:</h4> 
<pre>
  {JSON.stringify(stats, null, 2)}
</pre>