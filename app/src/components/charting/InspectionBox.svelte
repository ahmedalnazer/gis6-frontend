<script>
  import zones from 'data/zones'
  import { colors } from 'data/charting/line-utils'
  import _ from 'data/language'
  import convert from 'data/language/units'
import { tick } from 'svelte'


  export let inspect
  export let properties
  export let propertyOptions
  export let getTS
  export let canvasWidth
  export let setInspectionPoint
  export let canvasWrapper
  export let wrapperHeight


  let boxWidth, boxHeight
  let offset = [ 0, 0 ]
  let dragLeft = 0
  let dragTop = 0
  let dragging = false

  $: point = inspect && inspect.point || { x: -1, y: -1 }

  $: selectedZone = $zones.find(x => x.number == inspect.zone)

  $: inspectedProps = properties.map((x, i) => {
    const ops = propertyOptions.find(p => p.id == x)
    return ops ? { ...ops, color: colors[i + 1] } : null
  }).filter(x => !!x)

  let stamp = ''

  $: {
    if(inspect && inspect.point) {
      const t = new Date(getTS(inspect.point.x))
      let h = ''+t.getHours()
      let m = ''+t.getMinutes()
      let s = ''+t.getSeconds()
      stamp = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`
    }
  }


  const down = e => {
    e.stopPropagation()
    const x = showLeft ? e.offsetX - boxWidth : e.offsetX
    const y = showUp ? e.offsetY : e.offsetY
    offset = [ x, y ]
    dragLeft = point.x
    dragTop = point.y
    dragging = true
    canvasWrapper.addEventListener('pointermove', move)
    canvasWrapper.addEventListener('pointerup', up)
  }

  const move = e => {
    if(dragging) {
      e.stopPropagation()
      const { top, left, right, bottom } = canvasWrapper.getBoundingClientRect()
      dragLeft = Math.min(Math.max(0, e.clientX - left), right - left)
      dragTop = Math.min(bottom - top, Math.max(0, e.clientY - top))
      setInspectionPoint(e, offset)
    }
  }

  const up = e => {
    // e.stopPropagation()
    canvasWrapper.removeEventListener('pointermove', move)
    dragging = false
  }

  $: left = dragging ? dragLeft - offset[0] : point.x
  $: top = dragging ? dragTop - offset[1] : point.y

  $: showLeft = left > canvasWidth - boxWidth + 120
  $: showUp = top > wrapperHeight - boxHeight

  $: onScreen = left > 0 && left <= canvasWidth + 10 && top > 0 && top <= wrapperHeight + 10
  
</script>

{#if dragging || selectedZone && onScreen}
  <div class='x-line' style='left:{inspect.point.x}px' />
  <div class='inspection-box' class:showLeft class:showUp style='left:{left}px;top:{top}px'>
    <div class='arrow'>◄</div>
    <div 
      class='body' 
      bind:offsetWidth={boxWidth} 
      bind:offsetHeight={boxHeight} 
      on:pointerdown={down}
      on:pointerup={up}
      on:pointercancel={up}
      on:mouseup={up}
      on:click|stopPropagation={up}
    >
      {#if selectedZone}
        <h3>{selectedZone.name}</h3>
        <div class='properties'>
          {#each inspectedProps as prop}
            {#if prop}
              <div class='color' style='background:{prop.color}' />
              <div class='prop-name'>
                {prop.name}
              </div>
              <div class='value'>
                {$convert({
                  type: prop.type, 
                  value: prop.id == 'deviation' ? inspect.frame.temp_sp - inspect.frame.actual_temp : inspect.frame[prop.id]
                })}
              </div>
            {/if}
          {/each}
          <div />
          <div class='time-label'>
            {$_('Time')}
          </div>
          <div class='value'>{stamp}</div>
        </div>
        <!-- <pre>
          {JSON.stringify(inspect, null, 2)}
        </pre> -->
      {:else}
        <h3>{$_('No Zone Selected')}</h3>
      {/if}
    </div>
    
  </div>
{/if}

<style lang="scss">
  .inspection-box {
    position: absolute;
    z-index: 2;
    user-select: none;

    .arrow {
      position: absolute;
      top: -25px;
      font-size: 32px;
      left: 0;
      text-shadow: -4px 4px 4px rgba(0, 0, 0, .2);
      color: white;
      z-index: 2;
      transform: scaleY(2);
    }

    .body {
      background: white;
      box-shadow: var(--shadow);
      position: absolute;
      top: -48px;
      left: 18px;
      border-radius: 4px;
      padding: 20px;
    }

    &.showLeft {
      .arrow {
        transform: scaleY(2) scaleX(-1);
        left: auto;
        right: 0;
      }
      .body {
        left: auto;
        right: 18px;
      }
    }

    &.showUp {
      .body {
        top: auto;
        bottom: -48px;
      }
    }
  }

  h3 {
    margin-top: 0;
  }

  .properties {
    display: grid;
    grid-template-columns: 20px 1fr 1fr;
    gap: 20px;
  }

  .prop-name {
    white-space: nowrap;
  }

  .value {
    text-align: right;
  }

  .color {
    height: 20px;
    width: 20px;
    margin-right: 20px;
  }

  .x-line {
    top: 0;
    position: absolute;
    height: 100%;
    /* border-right: 4px dashed var(--gray); */
    width: 2px;
    background-image: linear-gradient(0deg, var(--darkGray), var(--darkGray) 66%, transparent 66%, transparent 100%);
    background-size: 1px 20px;
  }
</style>