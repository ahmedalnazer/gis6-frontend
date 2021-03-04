<script>
  import Screen from 'layout/Screen.svelte'
  import GroupSelector from 'components/GroupSelector.svelte'
  // import { Modal, CheckBox } from 'components'
  import { activeGroup } from "data/groups"
  import ZoneTasks from 'components/taskbars/ZoneTasks.svelte'
  // import ZoneRow from '../easy-screen/ZoneRow.svelte'
  // import ZoneNamesRow from './ZoneNamesRow.svelte'
  // import Grouping from 'components/Grouping.svelte'
  import ZoneNamesGrouping from './ZoneNamesGrouping.svelte'
  // import ZoneNameGroup from './ZoneNamesGroup.svelte'
  // import ZoneGroup from "../groups/ZoneGroup.svelte"
  import { selectedZones as _selected } from 'data/zones'
  import _ from 'data/language'

  $: selectedGroup = $activeGroup
  let sortGroups = true
  let selection = []
  let displayedZones = []

  const clearSelection = () => {
    selection = []
    _selected.set([])
  }
    
  // $: {
  //   if(sortGroups) {
  //     _selected.set(selectionZones.map(x => x.zone))
  //   }
  // }

  // $: allSelected = $_selected.length == displayedZones.length

  // const toggleAll = () => {
  //   if($_selected.length) {
  //     _selected.set([])
  //   } else {
  //     _selected.set(displayedZones.map(x => x.id))
  //   }
  // }
</script>

<Screen title={$_('Zone Names')} id="zone-names" back='/hot-runner'>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div class="zone-name-subtitle-container">
    <div class="zone-name-subtitle">{$_("Select Zones")}</div>
    <div class="zone-names-clear-zones">
      {#if selection.length}
          <div on:click={clearSelection}>
              <div class="zone-names-clear-zones-content zone-name-clearzone-text">{$_("Clear Select Zones")}</div>
          </div>
      {:else}
          <div>
              <div class="zone-names-clear-zones-content zone-name-clearzone-text-muted">{$_("Clear Select Zones")}</div>
          </div>
      {/if}
    </div>
  </div>


  <div>
    <GroupSelector />
  </div>

  <div class="grouping-container">
    <div class='grouping'>
      <ZoneNamesGrouping bind:selection >
      </ZoneNamesGrouping>
    </div>    
  </div>
</Screen>

<style lang="scss">
  .grouping-container {
    padding-top: 20px;
  }

  .zone-name-subtitle-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .zone-name-subtitle {
    color: var(--darkBlue);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 27px;
    padding-bottom: 25px;
  }

  .zone-names-clear-zones-content {
    float: right;
    padding: 3px 10px 0px 10px;
    cursor: pointer;
  }

  .zone-names-clear-zones {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      grid-gap: 15px;
  }

  .zone-name-clearzone-text {
      color: #358DCA;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 22px;
  }

  .zone-name-clearzone-text-muted {
      color: var(--muted);
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 22px;
  }

  :global(.screen-header) {
    padding-bottom: 0px !important;
  }
</style>