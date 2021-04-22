<script>
  import Screen from "layout/Screen.svelte"
  import { activeGroup, sortGroups } from "data/groups"
  import { selectedZones as _selected } from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup.svelte"
  import { Modal, CheckBox } from "components"
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import ZoneRow from "./ZoneRow.svelte"
  import GroupSelector from "components/GroupSelector.svelte"
  import Grouping from 'components/Grouping.svelte'
  import { Icon } from 'components'

  $: selectedGroup = $activeGroup

  // selection when sorted by groups
  let selection = {}
  let displayedZones = []
  let showLegend = false

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
      <CheckBox label={$_("Show Groups")} checked={$sortGroups} onClick={sortGroups.toggle}/>
    {/if}

    <div class='links'>
      {#if $_selected.length}
        <a on:click={clearSelection} class='clear'>{$_('Clear Selection')}</a>
      {/if}
      <a on:click={() => showLegend = !showLegend}>{$_('Icon Legend')}</a>
    </div>

  </div>

  <div class='grouping'>
    <Grouping Zone={ZoneRow} Group={ZoneGroup} bind:selection bind:displayedZones >
      <div slot='all-zone-header' class='table-header-item grid'>
        <div>
          <CheckBox checked={allSelected} minus={$_selected.length && !allSelected} onClick={toggleAll} label={$_('Zone')} /> 
        </div>
        <div>{$_('Actual')}</div>
        <div>{$_('Output')} (%)</div>
        <div>{$_('Zone Settings')}</div>
      </div>
    </Grouping>
  </div>
  <div class='footer-groups'>
    <GroupSelector />
  </div>
</Screen>

{#if showLegend}
  <Modal title={$_('Icon Legend')} onClose={() => showLegend = false}>
    <div class='icon-legend'>
      <div><Icon icon='zone-operation-auto' /> {$_('Automatic')}</div>
      <div><Icon icon='zone-operation-manual' /> {$_('Manual')}</div>
      <div><Icon icon='zone-operation-monitor' /> {$_('Monitor')}</div>
      <div><div class='stacked'><Icon icon='down' /><Icon icon='down' /></div> {$_('Standby')}</div>
      <div><Icon icon='lock' /> {$_('Locked')}</div>
      <div><Icon icon='sealed' />{$_('Sealed')}</div>
      <div><Icon icon='down' /> {$_('Temperature above setpoint')}</div>
      <div><div class='stacked'><Icon icon='up' /><Icon icon='up' /></div> {$_('Boost')}</div>
      <div><Icon icon='off' /> {$_('Off')}</div>
    </div>
  </Modal>
{/if}


<style lang="scss">
  :global(#minicontroller) .screen-body {
    display: flex;
    flex-direction: column;
  }
  .tools {
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

  .grouping {
    flex: 1;
    overflow: auto;
  }

  .grouping :global(.grid) {
    display: grid;
    grid-template-columns: 264px 125px 125px 1fr;
    border: 1px solid #A2A4A8;
    border-bottom: 0px;
  }

  .grouping :global(.grid:last-child) {
    border-bottom: 1px solid #A2A4A8;
  }

  .grouping .grid.table-header-item {
    border: none;
    color: #011F3E;
    font-family: "Open Sans";
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 22px;
    div {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    div:first-of-type {
      justify-content: flex-start;
    }
    div:last-of-type {
      padding-left: 20%;
      justify-content: flex-start;
    }
  }

  #easy-screen :global(.screen-body) {
    padding-top: 2px;
  }
  
  .icon-legend {
    display: grid;
    grid-template-columns: 1fr 1fr 1.3fr .7fr;
    > div {
      display: flex;
      align-items: center;
      padding: 20px 0;
      padding-left: 12px;
      font-size: 16px;
      > :first-child {
        margin-right: 12px;
        margin-left: 12px;
      }
    }
    :global(svg) {
      width: 20px;
      margin-right: 12px;
    }
    .circle {
      width: 20px;
      height: 20px;
      background: var(--blue);
      border-radius: 50%;
    }
    .sealed-circle {
      border: 3.2px solid var(--blue);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      // margin-left: auto;
      position: relative;
    }
    .sealed-line {
      height: 18px;
      width: 3.2px;
      background: var(--blue);
    }
    .stacked {
      display: flex;
      flex-direction: column;
    }
  }

  // .divHeaderSortableList{ }

</style>
