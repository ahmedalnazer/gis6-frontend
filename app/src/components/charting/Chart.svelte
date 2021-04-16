<script context="module">
  import { writable } from 'svelte/store'
  const marks = writable([])
</script>

<script>
  import _ from 'data/language'
  import ChartCanvas from './ChartCanvas.svelte'
  import Scale from './Scale.svelte'
  import LineX from './LineX.svelte'
  import Gestures from 'data/charting/gestures'
  import CheckBox from 'components/input/CheckBox.svelte'

  export let type = 'line'
  export let properties = [ 'actual_temp' ]
  export let zones = []
  export let colors = {}
  export let scales = {}
  export let stats = {}
  export let paused = false
  export let mode = 'pan'
  export let moved = false

  export const mark = () => {
    const t = new Date().getTime() - 1000
    marks.update(m => m.concat([ t ]))
  }

  const defaultPosition = {
    panX: 0,
    panY: 0,
    zoomX: 1,
    zoomY: 1
  }

  let position = { ...defaultPosition }
  
  const gestures = new Gestures()

  export const resetPosition = () => {
    position = { ...defaultPosition }
    gestures.set(position)
  }

  export const resetMarkers = () => markers = []

  let scale = {
    y: {},
    x: 20
  }
  let scaleData = {}
  let canvasWidth = 0
  let canvasHeight = 0

  // for testing purposes, if true will trigger "stress test mode"
  let jank = false

  $: {
    moved = false
    for(let key of Object.keys(defaultPosition)) {
      if(position[key] != defaultPosition[key]) {
        moved = true
      }
    }
  }

  $: totalZones = zones.length  

  const elasticConstrain = () => {
    paused = true
    let leftBounds = (position.zoomX - 1) * canvasWidth / 2
    let outOfBounds = leftBounds - position.panX > 0
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

  gestures.subscribe(p => position = p)
  gestures.subscribeComplete(elasticConstrain)

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

  let wrapperHeight = 0
  let top = 0

  $: {
    const gap = wrapperHeight / 20
    top = position.panY % gap
    if(position.panY < 0) top = top + gap
  }

  $: hiddenLine = top == 0 ? - 1 : 20

  let inspectionBase = [ 0, 0 ]
  let inspectionPoint = [ 0, 0 ]
  let inspectionStats = {}


  $: center = [ canvasWidth / 2, canvasHeight / 2 ]
  $: zoomXOffset = center[0] + center[0] / position.zoomX

  const setInspectionPoint = e => {
    if(mode == 'inspect') {
      inspectionBase = [ 
        e.offsetX - position.panX / position.zoomX, 
        e.offsetY - position.panY ]
    }
  }

  $: {
    const x = inspectionBase[0] + position.panX / position.zoomX
    inspectionPoint = [ x - zoomXOffset, inspectionBase[1] + position.panY ]
  }

  $: console.log(mode, inspectionBase, inspectionPoint)

  $: chartProps = { properties, paused, type, scale, zones, type, position, jank }

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

  <div class='canvas' bind:offsetHeight={wrapperHeight} on:click={setInspectionPoint}>

    <div class='h-grid' class:offset={top} style='transform: translateY({top}px)'>
      {#each hLines as l}
        <div class='grid-line' class:hidden={hiddenLine == l}/>
      {/each}
    </div>
    <div class='v-grid'>
      {#if type == 'line'}
        <LineX {...{ scaleData, marks }} />
      {/if}
    </div>

    <ChartCanvas bind:stats bind:scaleData bind:width={canvasWidth} bind:height={canvasHeight} {...chartProps} />

    <div class='stats' on:pointerdown|stopPropagation on:pointerup|stopPropagation>
      <p><strong>{stats.framerate} fps</strong> {#if !stats.offscreen}<span style='color: red'>⛔️</span>{/if}</p>
      <p><strong>Points:</strong> {(''+stats.totalPoints).padStart(3, '0')}</p>
      <p><strong>Zones:</strong> {totalZones}</p>
      <p><strong>Lines:</strong> {totalZones * properties.filter(x => !!x).length}</p>
      <p><strong>Resolution:</strong> {stats.resolution * 25}%</p>
      <p><CheckBox bind:checked={jank} label='Stress'/></p>
    </div>
    
    <div class='loading' class:active={stats.loading !== false && !stats.plotFilled}>
      {$_('Loading data...')}
    </div>

    {#if mode == 'inspect'}
      <div class='inspection-box' style='left:{inspectionPoint[0]}px;top:{inspectionPoint[1]}px'>

      </div>
    {/if}
  </div>

  <div class='scales' style='transform: translateY({top}px)'>
    <Scale property={properties[1]} {stats} {position} color={colors[2]} />
    <Scale property={properties[3]} {stats} {position} color={colors[4]} />
  </div>

  {#if stats.resolution < 3}
    <div class='res-warning'>
      {$_('High data volume detected, using low plot resolution')}
    </div>
  {/if}
</div>

<style lang="scss">
  .chart {
    display: flex;
    border: 1px solid #ddd;
    padding: 32px 16px;
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
    height: calc(100%);
    .grid-line {
      border-bottom: 1px solid var(--gray);
      &.hidden {
        opacity: 0;
      }
    }
  }

  .canvas {
    position: relative;
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
      :global(.checkbox) {
        margin: 0;
        padding: 0;
        height: auto;
      }
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

  .inspection-box {
    position: absolute;
    padding: 16px;
    background: white;
    box-shadow: var(--shadow);
  }

  .res-warning {
    position: absolute;
    right: 0;
    width: 100%;
    text-align: center;
    bottom: -18px;
    font-size: .8em;
    opacity: .5;
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