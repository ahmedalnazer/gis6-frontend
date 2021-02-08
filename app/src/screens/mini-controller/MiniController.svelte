<script>
  import { Icon } from 'components'
  import { tick } from "svelte"
  import Screen from "layout/Screen"
  import groups, { activeGroup, group_order, setGroupOrder } from "data/groups"
  import zones, { selectedZones as _selected, toggleZones } from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup"
  import { Modal, CheckBox } from "components"
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import { startSelection } from "../groups/selectZones"
  import ZoneBox from "./ZoneBox"
  import GroupSelector from "components/GroupSelector.svelte"
  import Sortable from "sortablejs"

  $: selectedGroup = $activeGroup
  let sortGroups = true

  $: displayedGroups = selectedGroup
    ? [ selectedGroup ]
    : $groups.concat([ { id: "unassigned", name: "Unassigned" } ])
  // $: console.log(`disp grps: ${displayedGroups}`);
  // $: selectedGroup,     console.log(selectedGroup)

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
  

  const boxSelect = (nodes) => {
    console.log(nodes)
  }

  $: displayedZones = selectedGroup
    ? $zones.filter((x) => x.groups && x.groups.includes(selectedGroup))
    : $zones

  let openGroups = {}

  let sortList, sortable

  const resetSortable = async () => {
    await tick()
    if(sortable) sortable.destroy()
    sortable = Sortable.create(sortList, {
      store: {
        get: s => $group_order,
        set: s => setGroupOrder(s.toArray())
      },
      handle: ".drag-header"
    })
  }

  $: {
    if(sortList && sortGroups && $group_order) {
      resetSortable()
    }
  }

  let showLegend = false
</script>

<Screen title={$_("Minicontroller")} id="minicontroller">
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div
    class="selection-area"
    on:mousedown={(e) => startSelection(e, boxSelect)}
  >
    <div class="tools">
      {#if !selectedGroup}
        <CheckBox label={$_("Show Groups")} bind:checked={sortGroups} />
      {/if}

      <a on:click={() => showLegend = !showLegend}>{$_('Icon Legend')}</a>
    </div>

    <div class="zone-container">
      {#if !selectedGroup && sortGroups}
        <div bind:this={sortList}>
          {#each displayedGroups.filter(x => x.id != 'unassigned') as group (group.id)}
            <div data-id={group.id}>
              <ZoneGroup
                bind:open={openGroups[group.id]}
                {group}
                bind:selection={selection[group.id]}
                onClearSelection={() => {clearSelection();}}
              />
            </div>
          {/each}
        </div>
        {#each displayedGroups.filter(x => x.id == 'unassigned') as group (group.id)}
            <ZoneGroup
              bind:open={openGroups[group.id]}
              {group}
              bind:selection={selection[group.id]}
              onClearSelection={() => {clearSelection();}}
            />
        {/each}
      {:else}
        {#if selectedGroup && !displayedZones.length}
          <p class="muted">{$_("No zones have been assigned to this group")}</p>
        {/if}
        <div class="zones">
          {#each displayedZones as zone (zone.id)}
            <ZoneBox
              {zone}
              active={$_selected.includes(zone.id)}
              on:click={() => toggleZones(zone.id)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div class='footer-groups'>
    <GroupSelector />
  </div>
</Screen>

{#if showLegend}
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
{/if}


<style lang="scss">
  :global(#minicontroller) .screen-body {
    display: flex;
    flex-direction: column;
  }
  .tools {
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    > :global(*) {
      margin-right: 16px;
    }
  }

  .zone-container {
    flex: 1;
    overflow: auto;
  }

  .selection-area {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;
  }

  .selection-area :global(.zones) {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-gap: 8px;
    overflow: auto;
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
