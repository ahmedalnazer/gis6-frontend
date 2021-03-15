<script>
  // import zones, { selectedZones, activeZones } from 'data/zones'
  import { Collapsible, CheckBox } from 'components'
  import { onDestroy, createEventDispatcher } from 'svelte'
  import _ from 'data/language'
  
  export let displayData = []
  export let selectedData = []
  export let label = ''
  
  const dispatch = createEventDispatcher()

  $: selectLabel = selectedData.map(x => x.name).join(', ')
  // $: label = $activeZones.map(x => x.name).join(', ')
  let open = false
  let anchor, dropdown

  $: {
    if(anchor && dropdown) document.body.append(dropdown)
  }

  onDestroy(() => {
    dropdown.remove()
  })

  const openDropdown = () => {
    const { top, left, right } = anchor.getBoundingClientRect()
    dropdown.style.top = `${top - 48}px`
    dropdown.style.left = `${left}px`
    dropdown.style.width = `${Math.max(right - left, 200)}px`

    setTimeout(() => {
      dropdown.focus()
    }, 0)
  }

  const toggleSelected = displayDataItem => {
    console.log(selectedData)

    let isChecked = selectedData.filter(x => x.id == displayDataItem.id).length > 0
    if (isChecked) {
      selectedData = selectedData.filter(x => x.id !== displayDataItem.id)
      console.log('pop')
    }
    else {
      selectedData = [ ...selectedData, displayDataItem ]
      console.log('push')
    }

    console.log(selectedData)

    dispatch('change', selectedData)
  }

  const isSelected = displayDataItem => {
    return selectedData.filter(x => x.id == displayDataItem.id).length > 0

    // toggleZones(zone)
    // dispatch('change', $selectedZones)
  }

  const toggleAll = () => {
    if (selectedData == displayData) {
      selectedData = []
    }
    else {
      selectedData = displayData
    }

    // if(selectedData.length == 0 || selectedData.length == 1) {      
    // }

    // if(selectedData.length == 0 || selectedData.length == 1) {
    //   selectedData.push(displayData.map(x => x.id))
    // } else {
    //   // Select the first zone as default if everything is empty
    //   selectedData.push(displayData.map(x => x.id).slice(0, 1))
    // }
    // dispatch('change', selectedData)
  }

  // $: {
  //   if($selectedZones.length == 0) {
  //     selectedZones.set($zones.map(x => x.id).slice(0, 1))
  //     dispatch('change', $selectedZones)
  //   }
  // }

</script>

<div class='control-area-dropdown'>
  <h3>{label}</h3>
  <div class='current' on:click={openDropdown}>
    <div class='label'>
      {#if selectedData.length}
        <span class='selected'>{selectLabel}</span>
      {:else}
        <span class='muted'>No item selected</span>
      {/if}
    </div>
    <div class='arrow'>
      <div class='down' />
    </div>
  </div>

  <div class='dropdown-anchor' bind:this={anchor}>
    <div 
      class='dropdown'
      bind:this={dropdown}
      tabindex='-1'
      on:focus={() => open = true}
      on:blur={() => open = false}
    >
      <Collapsible {open}>
        <div class='menu'>
          <div class='check-area' on:click={toggleAll}>
            <CheckBox checked={selectedData.length == displayData.length} minus={selectedData.length > 0} /> {$_('All types')}
          </div>
          {#each displayData as displayDataItem}
            <div class='check-area' on:click={() => toggleSelected(displayDataItem)}>
                <CheckBox checked={selectedData.filter(x => x.id == displayDataItem.id).length > 0} /> 
                <!-- <CheckBox checked={(displayDataItem) => isSelected(displayDataItem)} />  -->
              <span>
                {displayDataItem.name}
              </span>
            </div>
          {/each}
          
          <!-- {#each $zones as zone (zone.id)}
            <div
              class='zone'
              class:selected={$selectedZones.includes(zone.id)}
              on:click={() => toggleZone(zone)}
            >
              <CheckBox checked={$selectedZones.includes(zone.id)} /> 
              <span class:danger-text={zone.hasAlarm} class:warning-text={zone.hasWarning} class:muted={!zone.settings.on}>
                {zone.name}
              </span>
            </div>
          {/each} -->

        </div>
      </Collapsible>
    </div>
  </div>
</div>

<style lang="scss">
  h3 {
    margin-bottom: 10px;
  }
  .control-area-dropdown {
    position: relative;
    width: 100%;
    min-width: 0;
  }
  // .zone-dropdown {
  //   position: relative;
  //   width: 100%;
  //   min-width: 0;
  // }
  .current {
    width: 100%;
    position: relative;
    padding-right: 32px;
    background: var(--pale);
    padding: 10px 20px;
    height: 48px;
    display: flex;
    align-items: center;
  }
  .label {
    white-space: nowrap;
    max-height: 18px;
    text-overflow: ellipsis;
    margin-right: 20px;
    overflow: hidden;
    min-width: 0;
    max-width: 100%;
  }
  .dropdown-anchor {
    position: absolute;
    width: 100%;
    top: 100%;
  }
  .dropdown {
    position: fixed;
    z-index: 9999;
    max-height: 50vh;
    overflow: auto;
    background: var(--pale);
  }
  .menu {
    padding-top: 16px;
  }

  // .zone {
  //   font-size: 16px;
  //   padding: 10px 20px;
  //   display: flex;
  //   align-items: center;
  //   :global(.checkbox) {
  //     padding: 0;
  //   }
  // }

  .check-area {
    font-size: 16px;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
    :global(.checkbox) {
      padding: 0;
    }
  }

  .arrow {
    position: absolute;
    display: flex;
    right: 0;
    top: 0;
    height: 100%;
    justify-content: center;
    align-items: center;
    padding-right: 16px;
    pointer-events: none;
  }
  .down {
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid var(--blue);
  }
</style>