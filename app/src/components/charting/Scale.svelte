<script>
  export let stats = {}
  export let property

  $: mins = stats.min || {}
  $: maxes = stats.max || {}

  $: min = mins[property] / 10
  $: max = maxes[property] / 10

  $: range = max - min
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

<div class='scale'>
  <span>{getValue(max)}</span>
  {#each intervals as n}
    <span>{getValue(n)}</span>
  {/each}
  <span>{getValue(min)}</span>
</div>

<style>
  .scale {
    display:flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    margin: 0 4px;
  }
</style>