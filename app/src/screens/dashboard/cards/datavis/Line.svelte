<script>
  import Chart from 'components/charting/Chart.svelte'
  import { colors } from 'data/charting/line-utils'

  export let zones
</script>

<div class='chart-wrapper'>
  <Chart
    type='line'
    zones={zones.map(x => x.number)}
    properties={[ 'actual_temp' ]}
    mode='pan'
    {colors}
  />
</div>

<style>
  .chart-wrapper {
    pointer-events: none;
  }
</style>
