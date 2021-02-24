<script>
  import Screen from "layout/Screen"
  import { activeGroup } from "data/groups"
  import zones, { activeZones, selectedZones as _selected } from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup"
  import { CheckBox } from "components"
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import ZoneRow from "./ZoneRow"
  import GroupSelector from "components/GroupSelector.svelte"
  import Grouping from 'components/Grouping.svelte'

  $: selectedGroup = $activeGroup
  let sortGroups = true

  // selection when sorted by groups
  let selection = {}
  let displayedZones = []

  const clearSelection = () => {
    for (let key of Object.keys(selection)) {
      selection[key] = []
    }
    _selected.set([])
  }

  $: selectionZones = Object.keys(selection)
    .map((x) => selection[x].map((zone) => ({ zone, group: x })))
    .reduce((all, arr) => all.concat(arr), [])

  $: {
    if(sortGroups) {
      _selected.set(selectionZones.map(x => x.zone))
    }
  }

  $: allSelected = $_selected.length == displayedZones.length

  const toggleAll = () => {
    if($_selected.length) {
      _selected.set([])
    } else {
      _selected.set(displayedZones.map(x => x.id))
    }
  }
</script>

<Screen group='zones' id="easy-screen" back='/hot-runner'>
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div class="tools">
    {#if !selectedGroup}
      <CheckBox label={$_("Show Groups")} bind:checked={sortGroups} />
    {/if}

    <div class='links'>
      {#if $_selected.length}
        <a on:click={clearSelection} class='clear'>{$_('Clear Selection')}</a>
      {/if}
    </div>

  </div>

  <div class='grouping'>
    <Grouping Zone={ZoneRow} Group={ZoneGroup} bind:sortGroups bind:selection bind:displayedZones >
      <div slot='all-zone-header' class='grid'>
        <div>
          <CheckBox checked={allSelected} minus={$_selected.length && !allSelected} onClick={toggleAll} label={$_('Zone')} /> 
        </div>
        <div>{$_('Actual')}</div>
        <div>{$_('Output')} (%)</div>
        <div>{$_('Settings')}</div>
      </div>
    </Grouping>
  </div>
  <div class='footer-groups'>
    <GroupSelector />
  </div>
</Screen>


<style lang="scss">
  :global(#minicontroller) .screen-body {
    display: flex;
    flex-direction: column;
  }
  .tools {
    margin-bottom: 24px;
    display: flex;
    > :global(*) {
      margin-right: 16px;
    }
    .links {
      margin-left: auto;
      .clear {
        margin-right: 16px;
      }
    }
  }

  .footer-groups {
    margin-bottom: -40px;
    margin-left: -40px;
    margin-right: -40px;
  }


  .stacked {
    display: flex;
    flex-direction: column;
  }

  .grouping {
    flex: 1;
    overflow: auto;
  }

  .grouping :global(.grid) {
    display: grid;
    grid-template-columns: 264px 125px 125px 1fr;
  }

  .grouping :global(.grid > div:last-child) {
    padding-left: 130px;
  }



  // .divHeaderSortableList{ }

</style>
