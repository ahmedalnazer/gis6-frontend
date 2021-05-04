<script>
  import { tick } from "svelte"
  import groups, { sortGroups as _sortGroups, activeGroup, group_order, setGroupOrder } from "data/groups"
  import zones, { selectedZones as _selected, toggleZones } from "data/zones"
  import _ from "data/language"
  import { startSelection } from "screens/groups/selectZones"
  import Sortable from "sortablejs"

  export let Zone
  export let Group
  export let grid = false

  export let displayedZones = []

  $: selectedGroup = $activeGroup
  $: sortGroups = $_sortGroups

  $: displayedGroups = selectedGroup
    ? [ selectedGroup ]
    : $groups.concat([ { id: "unassigned", name: "Unassigned" } ])

  // selection when sorted by groups
  export let selection = {}

  export const clearSelection = () => {
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
    for(let [ nodeString, group ] of nodes) {
      const node = parseInt(nodeString)
      if(group) {
        if(selection[group].includes(node)) {
          selection[group] = selection[group].filter(x => x != node)
        } else {
          selection[group].push(node)
        }
        selection = selection
      } else {
        toggleZones(node)
      }
    }
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
    if(sortList && sortGroups && $group_order) resetSortable()
  }

</script>

<div
  class="selection-area"
  class:grid
  on:touchstart={(e) => startSelection(e, boxSelect)}
  on:mousedown={(e) => startSelection(e, boxSelect)}
>
  <div class="zone-container">
    {#if !selectedGroup && sortGroups}
      <div bind:this={sortList}>
        {#each displayedGroups.filter(x => x.id != 'unassigned') as group (group.id)}
          <div data-id={group.id}>
            <Group
              bind:open={openGroups[group.id]}
              {group}
              bind:selection={selection[group.id]}
            />
          </div>
        {/each}
      </div>
      {#each displayedGroups.filter(x => x.id == 'unassigned') as group (group.id)}
          <Group
            bind:open={openGroups[group.id]}
            {group}
            bind:selection={selection[group.id]}
          />
      {/each}
    {:else}
      {#if selectedGroup && !displayedZones.length}
        <p class="muted">{$_("No zones have been assigned to this group")}</p>
      {/if}
      <div class="zones">

        <slot name='all-zone-header' />

        {#each displayedZones as zone (zone.id)}
          <Zone
            {zone}
            active={$_selected.includes(zone.id)}
            on:click={() => toggleZones(zone.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>


<style lang="scss">
  :global(#minicontroller) .screen-body {
    display: flex;
    flex-direction: column;
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

  .selection-area.grid :global(.zones) {
    display: grid;
    // grid-template-columns: repeat(8, 1fr);
    grid-template-columns: repeat(6, 1fr);
    grid-gap: 5px;
    overflow: auto;
  }

</style>
