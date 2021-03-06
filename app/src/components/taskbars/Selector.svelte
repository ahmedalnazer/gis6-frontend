<script context='module'>
  let selectorMounted = false
</script>

<script>
  import { onMount, onDestroy } from 'svelte'
  import groups from 'data/groups'
  import _ from 'data/language'
  import zones, { selectedZones, activeZones } from 'data/zones'
  import ZoneDropdown from 'components/ZoneDropdown.svelte'
  import { notify } from 'data'
  import Icon from 'components/Icon.svelte'
  import ZoneReadout from './ZoneReadout.svelte'
  import { openSetpointEditorVai } from 'data/setpoint'

  export let onSubmit
  export let trackHistory = false
  export let manualReadout = false
  export let onUndo

  export let getUndoAction = _zones => {
    const cached = _zones.map(x => ({ ...x }))

    return async () => {
      for(let z of cached) {
        await zones.update(z, z, { skipReload: true })
      }
      await zones.reload()
    }
  }

  let applied = {}

  export const resetApplied = () => {
    applied = {}
  }

  export let valid = true

  let emptyBody
  

  let history = []

  const registerAction = zones => {
    if(trackHistory) {
      const curState = { ...applied }
      const undoAction = getUndoAction(zones)

      const undoFn = () => {
        applied = curState
        undoAction()
        onUndo()
      }

      history = history.concat(undoFn)
    }
    onSubmit(zones)
  }

  const undo = () => {
    const fn = history.pop()
    fn()
    notify.success($_('Action undone'))
    history = history
  }

  const applySelected = () => {
    registerAction($activeZones)
    applied.selected = true
  }

  const applyGroup = (group) => {
    registerAction($zones.filter((x) => x.groups && x.groups.includes(group.id)))
    applied[group.id] = true
  }

  const applyAll = () => {
    registerAction($zones)
    applied.selected = true
    applied.all = true
    for(let g of $groups) {
      applied[g.id] = true
    }
  }

  let dummySelection = false

  const key = {}
  onMount(() => {
    selectorMounted = key
    if($activeZones.length == 0 && $zones.length) {
      selectedZones.set([ $zones[0].id ])
      dummySelection = true
    }
  })

  onDestroy(() => {
    if(selectorMounted == key && dummySelection) selectedZones.set([])
  })
</script>

<div class="zone-select-wrapper">
  {#if $openSetpointEditorVai.source != "materialdb"}
  <div class="zone-dropdown">
    <h2>{$_('Select')}</h2>
    <div class='selection'>
      <ZoneDropdown on:change />
      <ZoneReadout zone={$activeZones[0]} manual={manualReadout} />
    </div>
  </div>
  {/if}

  <div class="body">
    <slot>
      <div bind:this={emptyBody} />
    </slot>
  </div>

  <div class="groups">
    <h2 class='apply'>
      {$_('Apply')} 
      {#if history.length}
        <div class='undo' on:click={undo}>
          <Icon icon='undo' color='var(--primary)' /> {$_('Undo')}
        </div>
      {/if}
    </h2>
    <div class="buttons">
      {#if $openSetpointEditorVai.source != "materialdb"}
      <div 
        class="button ignore-task-styles" 
        class:applied={applied.selected && $activeZones.length} 
        class:disabled={!$activeZones.length || !valid}
        on:click={applySelected}
      >
        <Icon icon='check' color='var(--primary)' /> {#if $activeZones.length == 1}
          {$activeZones[0].name}
        {:else}
          {$_("Selected Zones")}
        {/if}
      </div>
      {/if}
      <div 
        class="button ignore-task-styles" 
        class:applied={applied.all}
        class:disabled={!valid}
        on:click={applyAll}
      >
        <Icon icon='check' color='var(--primary)' /> {$_("All Zones")}
      </div>
      {#each $groups as group (group.id)}
        <div
          class="button ignore-task-styles"
          class:applied={applied[group.id]}
          class:disabled={!valid}
          on:click={() => applyGroup(group)}
        >
          <span><Icon icon='check' color='var(--primary)' /></span> 
          <span>{group.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- <div class="done">
    <button class="button ignore-task-styles active" on:click={e => onDone()}>
      {$_("Done")}
    </button>
  </div> -->
</div>

{#if emptyBody}
  <style>
    .body {
      display: none;
    }
  </style>
{/if}

<style lang="scss">
  .zone-select-wrapper :global(h2) {
    margin-top: 0;
    padding-top: 0;
    font-size: 22px;
    margin-bottom: 16px;
  }
  .selection {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, 1fr);
  }
  .zone-dropdown, .body, .groups {
    padding: 32px 0;
  }
  .zone-dropdown,
  .body {
    border-bottom: 1px solid var(--grayBorder);
  }
  .zone-dropdown {
    padding-top: 0;
    margin-top: 0;
  }
  .done {
    text-align: center;
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 24px;
    grid-row-gap: 32px;
    margin-bottom: 32px;
  }
  .button {
    padding: 12px;
    :global(svg) {
      opacity: 0;
      margin-left: -24px;
      transition: opacity .3s, margin .3s;
    }
  }
  .button.applied {
    :global(svg) {
      opacity: 1;
      margin-left: -16px;
    }
  }
  .zone-selector {
    width: 40%;
  }
  .apply {
    display: flex;
    vertical-align: center;
  }

  .apply :global(svg) {
    width: 16px;
    margin-right: 8px;
  }

  .undo {
    color: var(--primary);
    font-weight: normal;
    font-size: 18px;
    margin-left: 40px;
    display:flex;
    align-items: center;
  }

</style>
