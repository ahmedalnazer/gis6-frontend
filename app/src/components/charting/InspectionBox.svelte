<script>
  import zones from 'data/zones'
  import { colors } from 'data/charting/line-utils'
  import _ from 'data/language'
  export let inspect
  export let properties
  export let propertyOptions
  export let getTS
  export let canvasWidth
  export let setInspectionPoint
  export let setOffset

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

  let boxWidth
  $: left = point.x > canvasWidth - boxWidth + 120

  const move = e => {
    // e.inspextX = e.clientX - e.offsetX
    // e.inspectY = e.clientY - e.offsetY
    setInspectionPoint(e)
  }

  const down = e => {
    e.stopPropagation()
    const m = left ? -1 : 1
    setOffset([ e.offsetX * m, e.offsetY * m ])
  }

  const up = e => {
    setOffset([ 0, 0 ])
  }
  
</script>

{#if selectedZone && point.x > 0 && point.y > 0}
  <div class='inspection-box' class:left style='left:{inspect.point.x}px;top:{inspect.point.y}px'>
    <div class='arrow'>◀</div>
    <div 
      class='body' 
      bind:offsetWidth={boxWidth} 
      on:pointerdown={down} 
      on:pointermove={move}
      on:pointerup={up}
      on:pointercancel={up}
    >
      <h3>{selectedZone.name}</h3>
      <div class='properties'>
        {#each inspectedProps as prop}
          {#if prop}
            <div class='color' style='background:{prop.color}' />
            <div class='prop-name'>
              {prop.name}
            </div>
            <div class='value'>
              {prop.id == 'deviation' ? inspect.frame.temp_sp - inspect.frame.actual_temp : inspect.frame[prop.id]}
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
    </div>
    
  </div>
  <div class='x-line' style='left:{inspect.point.x}px' />
{/if}

<style lang="scss">
  .inspection-box {
    position: absolute;

    .arrow {
      position: absolute;
      top: -16px;
      font-size: 32px;
      left: 0;
      text-shadow: -4px 4px 4px rgba(0, 0, 0, .2);
      color: white;
      z-index: 2;
    }

    .body {
      background: white;
      box-shadow: var(--shadow);
      position: absolute;
      top: -48px;
      left: 24px;
      border-radius: 4px;
      padding: 20px;
    }

    &.left {
      .arrow {
        transform: scaleX(-1);
        left: auto;
        right: 0;
      }
      .body {
        left: auto;
        right: 24px;
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