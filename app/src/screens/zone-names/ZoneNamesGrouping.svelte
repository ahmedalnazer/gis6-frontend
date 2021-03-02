<script>
    import { tick } from 'svelte'
    import groups, { activeGroup, group_order, setGroupOrder } from 'data/groups'
    import zones, { selectedZones as _selected, toggleZones } from 'data/zones'
    import { selectedZones } from 'data/zones'
    import _ from 'data/language'
    import { startSelection } from "screens/groups/selectZones"
    import Sortable from 'sortablejs'
    import { CheckBox } from 'components/'
  
    // =================================
 
    export let Zone
    export let Group
    export let grid = false
    
    export let displayedZones = []
  
    $: selectedGroup = $activeGroup
    export let sortGroups = true
  
    $: displayedGroups = selectedGroup
      ? [ selectedGroup ]
      : $groups.concat([ { id: "unassigned", name: "Unassigned" } ])
  
    // selection when sorted by groups
    export let selection = []
  
    export const clearSelection = () => {
      for (let key of Object.keys(selection)) {
        selection[key] = []
      }
      _selected.set([])
    }
  
    // $: selectionZones = Object.keys(selection)
    //   .map((x) => selection[x].map((zone) => ({ zone, group: x })))
    //   .reduce((all, arr) => all.concat(arr), [])
  
    // $: {
    //   if(sortGroups) {
    //     _selected.set(selectionZones.map(x => x.zone))
    //   }
    // }

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
  
    $: allSelected = $zones.filter(x => (_selected.includes || []).includes(x.id)).length == zones.length

    const toggleAll = () => {
      if(selection.length) {
        selection = []
      } else {
        selection = $zones.map(x => x.id)
      }
    }

    $: displayedZonesRight = [ ...displayedZones ]
    $: displayedZonesLeft = displayedZonesRight.splice(0, Math.ceil(displayedZones.length/2))
</script>

<div class="zone-names-main-container">
    <div class="zone-names-main-grid">
        <div class="zone-name-sub-container-header">
            <div>
                <CheckBox checked={allSelected} minus={selection.length && !allSelected} onClick={toggleAll} label={$_('ID')} />
            </div>
            <div>Name</div>    
        </div>
    </div>
    <div class="zone-names-main-grid">
        <div class="zone-name-sub-container-header">
            <div>ID</div>
            <div>Name</div>    
        </div>
    </div>

    <div class="zone-names-main-grid">
        {#each displayedZonesLeft || [] as zone}
        <div class="zone-name-sub-container">
            <div>
                <CheckBox checked={selection.includes(zone.id)} /> {zone.id}
            </div>
            <div>{zone.name}</div>    
        </div>
        {/each}
    </div>

    <div class="zone-names-main-grid">
        {#each displayedZonesRight || [] as zone}
        <div class="zone-name-sub-container">
            <div>
                <CheckBox checked={selection.includes(zone.id)} /> {zone.id}
                <!-- <CheckBox checked={(selection.includes || []).includes(zone.id)} /> {zone.id} -->
            </div>
            <div>{zone.name}</div>    
        </div>
        {/each}
    </div>
</div>
 
<style lang="scss">
    .zone-names-main-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-gap: 8px;
    }

    .zone-names-main-grid {
        padding: 5px;
    }

    .zone-name-sub-container-header {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        height: 70px;
        align-content: center;
        padding: 32px 17px 17px 17px; 
    }

    .zone-name-sub-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        height: 70px;
        align-content: center;
        padding: 32px 17px 17px 17px;
        border: 1px solid var(--grayBorder);
        margin-bottom: -1px;
    }

    // :global(#minicontroller) .screen-body {
    //   display: flex;
    //   flex-direction: column;
    // }
  
    // .zone-container {
    //   flex: 1;
    //   overflow: auto;
    // }
    // .zone-names-main-container- {
    //   display: flex;
    //   flex-direction: column;
    //   flex: 1;
    //   overflow: auto;
    // }
    // .selection-area- {
    //   display: flex;
    //   flex-direction: column;
    //   flex: 1;
    //   overflow: auto;
    //   border: 1px solid salmon;
    // }
  
    .selection-area.grid :global(.zones) {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-gap: 8px;
      overflow: auto;
    }
  
  </style>
  