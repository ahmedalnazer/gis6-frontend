<script>
  import { Icon } from 'components'
  import Screen from "layout/Screen"
  import _ from "data/language"
  import { Modal, CheckBox, Input, Select } from "components"
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import faultAnalysis from 'data/analysis/fault'
  import Analysis from './Analysis'

  $: active = $faultAnalysis && $faultAnalysis.status == 'active'

</script>

<Screen title={$_("Fault Analysis")}>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <Analysis 
    analysis={faultAnalysis} 
    description={$_(`This test generally takes 5 minutes. All of the zones will be turned on 
    at the same time. Each zone will be heated to roughly 30°F (16°C) higher than the actual 
    value of the zone when the test was started. After a zone reaches the test temperature it 
    will be turned off. Zones in Manual or Locked status will not be tested.
    `)}
  />
</Screen>


<style lang="scss">

</style>
