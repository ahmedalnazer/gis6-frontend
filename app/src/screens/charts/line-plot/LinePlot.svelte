<script>
  import Screen from 'layout/Screen.svelte'
  import Chart from 'components/charting/Chart.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
</script>

<Screen>
  <div slot="tasks">
    <ZoneTasks />
  </div>
  <Chart type='line' />
</Screen>