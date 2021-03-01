<script>
  import Screen from 'layout/Screen.svelte'
  import Minicontroller from './cards/Minicontroller.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import FaultAnalysis from './cards/FaultAnalysis.svelte'
  import WiringAnalysis from './cards/WiringAnalysis.svelte'
  import EasyScreen from './cards/EasyScreen.svelte'
  import ZoneNames from './cards/ZoneNames.svelte'
  import user, { roles } from 'data/user'
  import _ from 'data/language'
  import LinePlotCard from './cards/LinePlotCard.svelte'

  // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
  $: showZoneNames = ($user || []).role ? ($user || []).role !== 2: false
</script>

<Screen title={$_('Hot Runner')} back='/'>
  <div slot="tasks">
    <ZoneTasks />
  </div>
  
  <div class='hot-runner-dash card-grid'>
    <Minicontroller />
    <EasyScreen />
    {#if showZoneNames}
      <ZoneNames />
    {/if}
    <FaultAnalysis />
    <WiringAnalysis />
    <LinePlotCard />
  </div>
</Screen>