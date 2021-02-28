<script>
  import Screen from 'layout/Screen.svelte'
  import Minicontroller from './cards/Minicontroller.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import FaultAnalysis from './cards/FaultAnalysis.svelte'
  import WiringAnalysis from './cards/WiringAnalysis.svelte'
  import EasyScreen from './cards/EasyScreen.svelte'
  import ZoneNames from './cards/ZoneNames'
  import user, { roles } from 'data/user'
  import _ from 'data/language'
  import LinePlotCard from './cards/LinePlotCard.svelte'

</script>

<Screen title={$_('Hot Runner')} back='/'>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div>
    <h3>{$_(roles[$user.role])}</h3>
  </div>
  
  <div class='hot-runner-dash card-grid'>
    <Minicontroller />
    <EasyScreen />
    <ZoneNames />
    <FaultAnalysis />
    <WiringAnalysis />
    <LinePlotCard />
  </div>
</Screen>