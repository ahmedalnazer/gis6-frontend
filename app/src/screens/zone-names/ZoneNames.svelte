<script>
  import Screen from 'layout/Screen.svelte'
  import GroupSelector from 'components/GroupSelector.svelte'
  import { Modal, CheckBox } from 'components'
  import { activeGroup } from "data/groups"
  import ZoneTasks from 'components/taskbars/ZoneTasks.svelte'
  // import ZoneRow from '../easy-screen/ZoneRow.svelte'
  import ZoneNamesRow from './ZoneNamesRow.svelte'
  // import Grouping from 'components/Grouping.svelte'
  import ZoneNamesGrouping from './ZoneNamesGrouping.svelte'
  import ZoneNameGroup from './ZoneNamesGroup.svelte'
  // import ZoneGroup from "../groups/ZoneGroup.svelte"
  import { selectedZones as _selected } from 'data/zones'
  import _ from 'data/language'

  $: selectedGroup = $activeGroup
  let sortGroups = true
  let selection = {}
  let displayedZones = []

  // $: {
  //   if(sortGroups) {
  //     _selected.set(selectionZones.map(x => x.zone))
  //   }
  // }

  $: allSelected = $_selected.length == displayedZones.length

  const toggleAll = () => {
    if($_selected.length) {
      _selected.set([])
    } else {
      _selected.set(displayedZones.map(x => x.id))
    }
  }
</script>

<Screen title={$_('Zone Names')} id="zone-names" back='/hot-runner'>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div class="zone-name-subtitle">{$_("Select Zone")}</div>

  <div>
    <GroupSelector />
  </div>

  <div class="grouping-container">
    <div class='grouping'>
      <ZoneNamesGrouping Zone={ZoneNamesRow} Group={ZoneNameGroup} bind:sortGroups bind:selection bind:displayedZones>
      </ZoneNamesGrouping>
    </div>    
  </div>
</Screen>

<style lang="scss">
  .grouping-container {
    padding-top: 20px;
  }

  .zone-name-subtitle {
    color: var(--darkBlue);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 27px;
    padding-bottom: 25px;
  }

  :global(.screen-header) {
    padding-bottom: 0px !important;
  }
</style>