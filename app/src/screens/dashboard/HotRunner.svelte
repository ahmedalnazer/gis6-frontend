<script>
  import Screen from 'layout/Screen.svelte'
  import Minicontroller from './cards/Minicontroller'
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import FaultAnalysis from './cards/FaultAnalysis'
  import WiringAnalysis from './cards/WiringAnalysis'
  import EasyScreen from './cards/EasyScreen'
  import ZoneNames from './cards/ZoneNames'
  import user, { roles } from 'data/user'
  import _ from 'data/language'

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
  </div>
</Screen>