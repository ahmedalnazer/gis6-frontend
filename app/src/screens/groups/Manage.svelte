<script>
  import Screen from 'layout/Screen'
  import groups from 'data/groups'
  import zones from 'data/zones'
  import _ from 'data/language'
  import ZoneGroup from './ZoneGroup'
  import { Modal } from 'components'
  import GroupForm from './GroupForm'
  import ZoneTasks from 'components/taskbars/ZoneTasks'
  import { startSelection } from './selectZones'
  import ZoneButton from './ZoneButton'
  import { CheckBox } from 'components/'
  import ModifyZones from './ModifyZones'

  let selectedGroup = null
  let sortGroups = true

  $: displayedGroups = selectedGroup ? [ selectedGroup ] : $groups.concat([ { id: 'unassigned', name: 'Unassigned' } ])

  let creating = false
  let adding = false
  let removing = false

  let newName, newColor

  const createGroup = () => {
    creating = false
    console.log(`CREATING NEW GROUP, name: ${newName}, color: ${newColor}`)
  }

  // selection when sorted by groups
  let selection = {}

  // selection when single group or unsorted
  let selectedZoneIds = []

  const clearSelection = () => {
    for(let key of Object.keys(selection)) {
      selection[key] = []
    }
  }

  $: selectedZones = Object.keys(selection)
    .map(x => selection[x].map(zone => ({ zone, group: x })))
    .reduce((all, arr) => all.concat(arr), [])

  
  const toggle = id => {
    if(selectedZoneIds.includes(id)) {
      selectedZoneIds = selectedZoneIds.filter(x => x != id)
    } else {
      selectedZoneIds = selectedZoneIds.concat(id)
    }
  }

  $: console.log(selection, selectedZones)

  const boxSelect = nodes => {
    console.log(nodes)
  }

  $: displayedZones = selectedGroup ? $zones.filter(x => x.groups && x.groups.includes(selectedGroup)) : $zones

  $: activeSelection = selectedGroup || !sortGroups ? selectedZoneIds : selectedZones.map(x => x.zone)

  $: console.log(activeSelection)

  $: zonesToModify = $zones.filter(z => {
    return activeSelection.includes(z.id)
  })

  const commitModify = () => {
    adding = false
    removing = false
    clearSelection()
  }

</script>

<Screen title={$_('Manage Groups')}>
  <div slot='tasks'>
    <ZoneTasks />
  </div>

  <div class='selection-area' on:mousedown={e => startSelection(e, boxSelect)}>
    <div class='group-selector'>
      
      <div class='tab' 
        on:click={() => selectedGroup = null} 
        class:active={!selectedGroup}
      >
        {$_('All Zones')}
      </div>
      
      {#each $groups as group (group.id)}
        {#if group.id != 'unassigned'}
          <div 
            class='tab' 
            on:click={() => selectedGroup = group.id}
            class:active={selectedGroup == group.id}
          >
            {group.name}
          </div>
        {/if}
      {/each}
    </div>
    <div class='tools'>
      {#if !selectedGroup}
        <CheckBox label={$_('Show Groups')} bind:checked={sortGroups} />
      {/if}
      {#if selectedZones.length}
        <span class='link' on:click={clearSelection}>{$_('Clear Selection')}</span>
        <span class='link' on:click={() => creating = true}>{$_('Create Group')}</span>
        <span class='link' on:click={() => adding = true}>{$_('Add to Group')}</span>
        <span class='link' on:click={() => removing = true}>{$_('Remove from Group')}</span>
      {/if}
    </div>
    {#if !selectedGroup && sortGroups}

      {#each displayedGroups as group (group.id)}
        <ZoneGroup group={group} bind:selection={selection[group.id]}/>
      {/each}

    {:else}
      {#if selectedGroup && !displayedZones.length}
        <p class='muted'>{$_('No zones have been assigned to this group')}</p>
      {/if}
      <div class='zones'>
        {#each displayedZones as zone (zone.id)}
          <ZoneButton
            zone={zone} 
            active={selectedZoneIds.includes(zone.id)} 
            on:click={() => toggle(zone.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
</Screen>


{#if creating}
  <Modal onClose={() => creating = false}>
    <GroupForm bind:name={newName} bind:color={newColor} onSubmit={createGroup}/>
  </Modal>
{/if}

{#if adding}
  <Modal title={$_('Add to Group')} onClose={() => adding = false}>
    <ModifyZones zones={zonesToModify} onCommit={commitModify} adding />
  </Modal>
{/if}

{#if removing}
  <Modal title={$_('Remove from Group')} onClose={() => removing = false}>
    <ModifyZones zones={zonesToModify} onCommit={commitModify} />
  </Modal>
{/if}


<style lang='scss'>
  .group-selector {
    display: flex;
    .tab {
      padding: 16px 32px;
    }
  }
  .tools {
    margin: 48px 0;
    > :global(*) {
      margin-right: 16px;
    }
  }
  .selection-area :global(.zones) {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-gap: 8px;
  }

  .tab {
    border: 1px solid var(--darkBlue);
    color: var(--darkBlue);
    &.active {
      background: var(--darkBlue);
      color: white;
    }
  }
</style>