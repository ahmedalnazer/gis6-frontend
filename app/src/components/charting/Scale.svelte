<script>
  export let stats = {}
  export let position
  export let property, color

  const spaces = 20
  let height = 0

  $: mins = stats.min || {}
  $: maxes = stats.max || {}

  $: trueMax = maxes[property] / 10
  $: trueMin = mins[property] / 10
  $: range = trueMax - trueMin

  $: offset = position.panY / height * range

  $: max = offset + trueMax
  $: min = offset + trueMin

  $: gap = range / spaces
  $: shim = max % gap
  
  let intervals = []

  $: {
    let values = []
    for(let i = 1; i < spaces; i++) {
      const v = max - i * gap
      values.push(v - shim)
    }
    intervals = values
  }

  const getValue = n => {
    // avoid displaying negative zero values
    if(n.toFixed(2) == '-0.00') n = 0
    let places = 0
    if(range < 20) places = 1
    if(range < 2) places = 2
    return n.toFixed(places)
  }

</script>

<div class='scale' style='color: {color};' bind:offsetHeight={height}>
  {#if property}
    <span>{getValue(max - shim)}</span>
    {#each intervals as n}
      <span>{getValue(n)}</span>
    {/each}
    <span>{offset == 0 ? getValue(min - shim) : ''}</span>
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
    /* padding: 8px 0; */
  }
  span {
    /* display: flex; */
    height: 0px;
    /* align-items: center; */
    position: relative;
    top: -9px;
  }
</style>