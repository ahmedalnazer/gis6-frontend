<script>
  import Screen from 'layout/Screen.svelte';
  import Minicontroller from './cards/Minicontroller'
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import FaultAnalysis from './cards/FaultAnalysis'
  import WiringAnalysis from './cards/WiringAnalysis'
  import _ from 'data/language'

</script>

<Screen title={$_('Hot Runner')}>
  <div slot="tasks">
    <ZoneTasks />
  </div>
  
  <div class='hot-runner-dash card-grid'>
    <Minicontroller />
    <FaultAnalysis />
    <WiringAnalysis />
  </div>
</Screen>