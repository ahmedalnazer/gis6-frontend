<script>
  import { Icon } from 'components'
  import Screen from "layout/Screen.svelte"
  import { activeGroup, sortGroups } from "data/groups"
  import { selectedZones as _selected } from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup.svelte"
  import { Modal, CheckBox } from "components"
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import ZoneBox from "./ZoneBox.svelte"
  import GroupSelector from "components/GroupSelector.svelte"
  import Grouping from 'components/Grouping.svelte'

  $: selectedGroup = $activeGroup

  // selection when sorted by groups
  let selection = {}

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

  let showLegend = false
</script>

<Screen group='zones' id="minicontroller" back='/hot-runner'>
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

  <Grouping grid Zone={ZoneBox} Group={ZoneGroup} bind:selection />
  <div class='footer-groups'>
    <GroupSelector />
  </div>
</Screen>

<!-- {#if showLegend}
  <Modal onClose={() => showLegend = false}>
    <div class='icon-legend'>
      <div><div class='circle' /> {$_('Off')}</div>
      <div><div class='stacked'><Icon icon='up' /><Icon icon='up' /></div> {$_('Boost')}</div>
      <div><Icon icon='down' /> {$_('Temperature below setpoint')}</div>
      <div><Icon icon='lock' /> {$_('Locked')}</div>
      <div>
        <div class='sealed-circle'>
          <div class='sealed-line' />
        </div>
        {$_('Sealed')}
      </div>
      <div><div class='stacked'><Icon icon='down' /><Icon icon='down' /></div> {$_('Standby')}</div>
      <div><Icon icon='down' /> {$_('Temperature above setpoint')}</div>
    </div>
  </Modal>
{/if} -->

{#if showLegend}
  <Modal title={$_('Icon Legend')} onClose={() => showLegend = false}>
    <div class='icon-legend'>
      <div><Icon icon='zone-operation-auto' size='35px' /> {$_('Automatic')}</div>
      <div><Icon icon='lock' size='35px' /> {$_('Locked')}</div>
      <div><div class='stacked'><Icon icon='up' /><Icon icon='up' /></div> {$_('Boost')}</div>
      <div><Icon icon='warning' size='35px' /> {$_('Critical fault')}</div>
      <div><Icon icon='zone-operation-manual' size='35px' /> {$_('Manual')}</div>
      <div><Icon icon='sealed' size='35px' />{$_('Sealed')}</div>
      <div><div class='stacked'><Icon icon='down' /><Icon icon='down' /></div> {$_('Standby')}</div>
      <div><Icon icon='information' size='35px' /> {$_('Warning')}</div>
      <div><Icon icon='zone-operation-monitor' size='30px' /> {$_('Monitor')}</div>
    </div>
  </Modal>
{/if}


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

  // .divHeaderSortableList{ }

</style>
