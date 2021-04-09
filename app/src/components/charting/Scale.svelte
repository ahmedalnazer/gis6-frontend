<script>
  export let stats = {}
  export let position
  export let property, color
  let div

  const spaces = 20
  let height = 0

  $: mins = stats.min || {}
  $: maxes = stats.max || {}

  $: trueMax = maxes[property] / 10
  $: trueMin = Math.min(trueMax - .2, mins[property] / 10)

  $: offset = -position.panY / height * (trueMax - trueMin)

  $: max = offset + trueMax
  $: min = offset + trueMin

  $: range = Math.max(.1, max - min)

  $: gap = Math.round(100 * (trueMax - trueMin) / spaces) / 100
  $: shim = max % gap
  $: {
    if(div) top = shim / range * div.offsetHeight
  }
  

  let intervals = []

  $: {
    let values = []
    for(let i = 1; i < spaces; i++) {
      const v = max - i / spaces * range
      values.push(v - shim)
    }
    intervals = values
  }

  const getValue = n => {
    let places = 0
    if(range < 20) places = 1
    if(range < 2) places = 2
    return n.toFixed(places)
  }

</script>

<div class='scale' style='color: {color};' bind:offsetHeight={height}>
  {#if property}
    <span>{position.panY > 0 ? '' : getValue(max - shim)}</span>
    {#each intervals as n}
      <span>{getValue(n)}</span>
    {/each}
    <span>{position.panY < 0 ? '' : getValue(min)}</span>
  {/if}
  <!-- {offset} -->
</div>

<style>
  .scale {
    display:flex;
    flex-direction: column;
    justify-content: space-between;
    /* height: calc(100% + 8px); */
    margin: 0 4px;
    min-width: 48px;
    text-align: right;
    padding: 8px 0;
  }
  span {
    display: flex;
    height: 0px;
    align-items: center;
  }
</style>