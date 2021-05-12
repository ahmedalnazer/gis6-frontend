<script>
  import Chart from 'components/charting/Chart.svelte'
  import { colors } from 'data/charting/line-utils'
  import lineConfig, { propertyOptions } from 'data/charting/line-config'

  export let zones

  $: properties = $lineConfig.properties || [ 'actual_temp' ]
  $: propOps = properties.map((x, i) => ({
    color: colors[i + 1],
    option: $propertyOptions.find(o => o.id == x)
  }))
  $: ordered = [ 2, 0, 1, 3 ].map(i => propOps[i]).filter(x => x && !!x.option)
  $: scales = $lineConfig.scales || {}
</script>

<div class='chart-wrapper'>
  <Chart
    type='line'
    zones={zones.map(x => x.number)}
    {properties}
    renderMode='minmax'
    mode='pan'
    {colors}
    {scales}
  />
</div>
<div class='key'>
  {#each ordered as p}
    <div style='color:{p.color}'>{p.option.name}</div>
  {/each}
</div>

<style>
  .chart-wrapper {
    pointer-events: none;
  }
  .key {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 16px;
  }
  .key > div {
    text-align: center;
  }
</style>
