<script>
  import Screen from "layout/Screen.svelte"
  import _ from "data/language"
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import Analysis from './Analysis.svelte'
</script>

<Screen title={$_('Wiring Analysis')}>
  <div slot='tasks'>
    <ZoneTasks />
  </div>

  <div class='wiring-analysis'>
    <Analysis
      type='wiring'
      description={$_(` This test will turn on each zone, determine if the zone is heating, determine if any other 
      zones are also heating, and then turn off the zone before moving onto the next one. Typically the 
      analysis takes two minutes per zone. While the test is running, you may view other parts of the 
      software and then return to review the results. 
      `)}
    />  
  </div>
</Screen>
