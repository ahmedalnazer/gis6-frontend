<script>
  import zones, { selectedZones, activeZones, toggleZones } from 'data/zones'
  import { Collapsible, CheckBox } from 'components'
  import { onDestroy } from 'svelte'

  $: label = $activeZones.map(x => x.name).join(', ')
  let open = false
  let anchor, dropdown

  $: {
    if(anchor && dropdown) document.body.append(dropdown)
  }

  onDestroy(() => {
    dropdown.remove()
  })

  const openDropdown = () => {
    const { top, left, right, bottom } = anchor.getBoundingClientRect()
    console.log('opening', top, left)
    dropdown.style.top = `${bottom}px`
    dropdown.style.left = `${left}px`
    dropdown.style.width = `${Math.max(right - left, 400)}px`
    setTimeout(() => {
      dropdown.focus()
    }, 0)
  }

</script>

<div class='zone-dropdown'>
  <div class='current' on:click={openDropdown}>
    <div class='label'>
      {#if $activeZones.length}
        {label}
      {:else}
        <span class='muted'>No zones selected</span>
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
          {#each $zones as zone (zone.id)}
            <div
              class='zone'
              class:selected={$selectedZones.includes(zone.id)}
              on:click={() => toggleZones(zone)}
            >
              <CheckBox checked={$selectedZones.includes(zone.id)} /> {zone.name}
            </div>
          {/each}
        </div>
      </Collapsible>
    </div>
  </div>
</div>

<style>
  .zone-dropdown {
    position: relative;
  }
  .current {
    width: 400px;
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
    text-overflow: ellipsis;
    overflow: hidden;
    width: calc(100% - 32px);
  }
  .dropdown-anchor {
    position: absolute;
    top: 100%;
  }
  .dropdown {
    position: fixed;
    z-index: 9999;
    max-height: 50vh;
    overflow: auto;
    background: var(--pale)
  }
  .zone {
    font-size: 16px;
    padding: 10px 20px;
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