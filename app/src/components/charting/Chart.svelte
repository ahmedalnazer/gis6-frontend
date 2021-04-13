<script>
  import _ from 'data/language'
  import ChartCanvas from './ChartCanvas.svelte'
  import Scale from './Scale.svelte'
  import LineX from './LineX.svelte'
  import Gestures from 'data/charting/gestures'
  import { onDestroy } from 'svelte'
  

  export let type = 'line'
  export let properties = [ 'actual_temp' ]
  export let zones = []
  export let colors = {}
  export let scales = {}
  export let paused = false
  // export let mode = 'pan'

  $: totalZones = zones.length

  export let stats = {}
  let scaleData = {}

  const gestures = new Gestures()

  const defaultPosition = {
    panX: 0,
    panY: 0,
    zoomX: 1,
    zoomY: 1
  }

  let position = { ...defaultPosition }

  export let moved = false

  $: {
    moved = false
    for(let key of Object.keys(defaultPosition)) {
      if(position[key] != defaultPosition[key]) {
        moved = true
      }
    }
  }

  export const resetPosition = () => {
    position = { ...defaultPosition }
  }

  // let up = true
  // const dummyPan = setInterval(() => {
  //   if(position.zoomX < -100 && !up) {
  //     up = true
  //   }
  //   if(position.zoomX > 100 && up) {
  //     up = false
  //   }
  //   position.zoomX = position.zoomX + (up ? 1 : -1)
  //   position.zoomY = position.zoomX
  // }, 50)

  // onDestroy(() => clearInterval(dummyPan))

  let canvasWidth = 0

  const elasticConstrain = () => {
    paused = true
    // let outOfBounds = false
    let leftBounds = (position.zoomX - 1) * canvasWidth / 2
    let outOfBounds = leftBounds - position.panX > 0
    // let outOfBounds = leftBounds >= 0 ? position.panX < leftBounds : position.panX > leftBounds
    // console.log(position.panX)
    // console.log(leftBounds)
    if(outOfBounds && Math.abs(position.panX - leftBounds) < 5) {
      position.panX = leftBounds
    } else if(outOfBounds) {
      position.panX = position.panX + Math.min((leftBounds - position.panX) / 16, 20 * position.zoomX)
    }
    gestures.set(position)
    if(outOfBounds) {
      setTimeout(elasticConstrain, 30 / 1000)
    }
  }

  const unSub = gestures.subscribe(p => position = p)
  const unSubComplete = gestures.subscribeComplete(elasticConstrain)

  onDestroy(() => {
    unSub()
    unSubComplete()
  })

  let scale = {
    y: {},
    x: 20
  }

  $: {
    let y = {}
    for(let i = 1; i <= 4; i++) {
      const prop = properties[i - 1]
      y[prop] = scales[i] ? scales[i] : { max: 'auto', min: 'auto' }
    }
    scale = { ...scale, y }
  }

  let hLines = []
  for(let i = 0; i < 21; i++) {
    hLines.push(i)
  }

  export let setBufferParams

  let wrapperHeight = 0
  let top = 0

  $: {
    const gap = wrapperHeight / 20
    top = position.panY % gap
  }

  $: hiddenLine = top == 0 
    ? - 1 
    : position.panY < 0 
      ? 0
      : 20 

  $: chartProps = { properties, paused, type, scale, zones, type, position }

</script>

<div class='chart' 
  on:pointerdown={gestures.pointerdown} 
  on:pointermove={gestures.move}
  on:mousewheel={gestures.move}
  on:pointerup={gestures.pointerup}
  on:pointercancel={gestures.pointerup}
  draggable='false'
>
  <div class='scales' style='transform: translateY({top}px)'>
    <Scale property={properties[2]} {stats} {position} color={colors[3]} />
    <Scale property={properties[0]} {stats} {position} color={colors[1]} />
  </div>

  <div class='canvas' bind:offsetHeight={wrapperHeight}>
    <div class='h-grid' class:offset={top} style='transform: translateY({top}px)'>
      {#each hLines as l}
        <div class='grid-line' class:hidden={hiddenLine == l}/>
      {/each}
    </div>
    <div class='v-grid'>
      {#if type == 'line'}
        <LineX {...{ scaleData, position }} />
      {/if}
    </div>
    <ChartCanvas bind:setBufferParams bind:stats bind:scaleData bind:width={canvasWidth} {...chartProps} />
    <div class='stats'>
      <p><strong>{stats.framerate} fps</strong> {#if !stats.offscreen}<span style='color: red'>⛔️</span>{/if}</p>
      <p><strong>Points:</strong> {(''+stats.totalPoints).padStart(3, '0')}</p>
      <p><strong>Zones:</strong> {totalZones}</p>
      <p><strong>Lines:</strong> {totalZones * properties.filter(x => !!x).length}</p>
    </div>
    <div class='loading' class:active={stats.loading !== false && !stats.plotFilled}>
      {$_('Loading data...')}
    </div>
  </div>

  <div class='scales' style='transform: translateY({top}px)'>
    <Scale property={properties[1]} {stats} {position} color={colors[2]} />
    <Scale property={properties[3]} {stats} {position} color={colors[4]} />
  </div>
</div>

<style lang="scss">
  .chart {
    display: flex;
    border: 1px solid #ddd;
    padding: 24px 16px;
    padding-bottom: 48px;
    position: relative;
    touch-action: none;
  }
  .scales {
    display: flex;
  }
  .h-grid, .v-grid {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .h-grid {
    display: flex;
    flex-direction:column;
    justify-content: space-between;
    padding: 8px 0;
    .grid-line {
      border-bottom: 1px solid var(--gray);
      &.hidden {
        opacity: 0;
      }
    }
  }

  .canvas {
    position: relative;
    padding: 8px 0;
    flex: 1;
    .stats {
      opacity: .5;
      position: absolute;
      top: 0;
      right: 0;
      background: rgba(0,0, 0, .5);
      color: white;
      padding: 4px 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      p {
        margin: 0;
        padding: 0;
      }
    }
  }
  .test-tools {
    margin: 40px 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }

  .loading {
    position: absolute;
    bottom: 0;
    right: 0;
    background:rgba(0,0, 0, .5);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 16px;
    pointer-events: none;
    opacity: 0;
    transition: opacity .3s;
  }
  .loading.active {
    opacity: 1;
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


<!-- <h4>Stats:</h4> 
<pre>
  {JSON.stringify(stats, null, 2)}
</pre> -->