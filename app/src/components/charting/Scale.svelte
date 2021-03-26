<script>
  export let stats = {}
  export let property, color

  $: mins = stats.min || {}
  $: maxes = stats.max || {}

  
  $: max = maxes[property] / 10
  $: min = Math.min(max - .2, mins[property] / 10)

  $: range = Math.max(.1, max - min)
  let intervals = []

  $: {
    let values = []
    const spaces = 20
    for(let i = 1; i < spaces; i++) {
      values.push(max - i / spaces * range)
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

<div class='scale' style='color: {color}'>
  {#if property}
    <span>{getValue(max)}</span>
    {#each intervals as n}
      <span>{getValue(n)}</span>
    {/each}
    <span>{getValue(min)}</span>
  {/if}
</div>

<style>
  .scale {
    display:flex;
    flex-direction: column;
    justify-content: space-between;
    /* height: calc(100% + 8px); */
    margin: 0 4px;
    min-width: 40px;
    text-align: right;
  }
</style>