<script>
  import Chart from 'components/charting/Chart.svelte'
  import zones from 'data/zones'
  import { colors } from 'data/charting/line-utils'
</script>

<div class='chart-wrapper'>
  <Chart
    type='line'
    zones={$zones.map(x => x.number)}
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
