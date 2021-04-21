<script>
    import { tick } from 'svelte'
    import groups, { activeGroup, group_order, setGroupOrder } from 'data/groups'
    import zones, { selectedZones as _selected, toggleZones } from 'data/zones'
    import { startSelection } from "screens/groups/selectZones"
    import _ from 'data/language'
    import Sortable from 'sortablejs'
    import { CheckBox } from 'components/'

    export let displayedZones = []
    export let selection = []

    let selectedGroupChanged = false
  
    $: selectedGroup = $activeGroup
    $: { newGroupSelected($activeGroup)}
 
    const clearSelection = () => {
      selection = []
      _selected.set([])
    }

    const newGroupSelected = (df) => {
      // Clear selection when group tab changes
      clearSelection()
    }

    $: displayedZones = selectedGroup
      ? $zones.filter((x) => x.groups && x.groups.includes(selectedGroup))
      : $zones
      
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
    
    const toggleAll = () => {
      if(selection.length) {
        selection = []
      } else {
        selection = displayedZones.map(x => x.id)
      }
    }

    const setSelection = (zoneid) => {
      if (selection.includes(zoneid)) {
        selection = selection.filter(x => x != zoneid)
      }
      else {
        selection = selection.concat(zoneid)
      }
    }

    // $: allSelected = $zones.filter(x => (_selected.includes || []).includes(x.id)).length == zones.length

    $: displayedZonesRight = [ ...displayedZones.sort((a, b) => a.id > b.id ? 1 : -1) ]
    $: displayedZonesLeft = displayedZonesRight.splice(0, Math.ceil(displayedZones.length/2))
    $: allSelected = selection.length == displayedZones.length

    const boxSelect = (nodes) => {
      for(let [ nodeString, group ] of nodes) {
        const node = parseInt(nodeString)
        if(group) {
          if(selection[group].includes(node)) {
            selection[group] = selection[group].filter(x => x != node)
          } else {
            selection[group].push(node)
          }
        } else {
          if (selection.includes(node)) {
            selection = selection.filter(x => x != node)
          } else {
            selection = selection.concat(node)
          }
        }
      }
      selection = selection
}

</script>

<div class="zone-names-main-container"
  on:touchstart={(e) => startSelection(e, boxSelect)}
  on:mousedown={(e) => startSelection(e, boxSelect)}
>
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
        <div class="zone-name-sub-container rb-box" class:active={selection.includes(zone.id)} on:click={() => setSelection(zone.id)} data-id={zone.id}>
            <div>
                <CheckBox checked={selection.includes(zone.id)} label={zone.ZoneNumber} />
            </div>
            <div class="zone-name-text">{zone.name}</div>    
        </div>
        {/each}
    </div>
    <div class="zone-names-main-grid">
        {#each displayedZonesRight || [] as zone}
        <div class="zone-name-sub-container rb-box" class:active={selection.includes(zone.id)} on:click={() => setSelection(zone.id)} data-id={zone.id}>
            <div>
                <CheckBox checked={selection.includes(zone.id)} label={zone.ZoneNumber} />  
            </div>
            <div class="zone-name-text">{zone.name}</div>    
        </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .zone-names-main-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        // grid-gap: 15px;
        row-gap: 0px;
        column-gap: 15px;
    }

    .zone-names-main-grid {
        padding: 5px 5px 0px 5px;
    }

    .zone-name-sub-container-header {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        height: 10px;
        align-content: center;
        padding: 32px 17px 15px 17px; 
        font-weight: 600;
        font-size: 16px;        
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

    .zone-type-toggle {
        float: right;
        padding: 10px;
    }

    // .zone-names-top-submenu-content {
    //     float: right;
    //     padding: 3px 10px 0px 10px;
    //     cursor: pointer;
    // }

    .zone-type-panel {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        padding: 100px;
    }
    
    .zone-name-text {
        color: #358DCA;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0;
        line-height: 22px;
    }
    
    .active {
        background: var(--pale);
    }

  </style>
  