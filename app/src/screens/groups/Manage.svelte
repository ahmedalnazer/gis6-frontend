<script>
  import Screen from 'layout/Screen'
  import _groups from 'data/groups'
  import _ from 'data/language'
  import ZoneGroup from './ZoneGroup'
  import { Modal } from 'components'
  import GroupForm from './GroupForm'
  import ZoneTasks from 'components/taskbars/ZoneTasks'
import { startSelection } from './selectZones'

  let selectedGroup = null

  $: groups = selectedGroup ? [ selectedGroup ] : $_groups.concat([ { id: 'unassigned', name: 'Unassigned' } ])

  let creating = false
  let newName, newColor
  const createGroup = () => {
    creating = false
    console.log(`CREATING NEW GROUP, name: ${newName}, color: ${newColor}`)
  }

  let selection = {}

  const clearSelection = () => {
    for(let key of Object.keys(selection)) {
      selection[key] = []
    }
  }

  $: selectedZones = Object.keys(selection)
    .map(x => selection[x].map(zone => ({ zone, group: x })))
    .reduce((all, arr) => all.concat(arr), [])

  $: console.log(selection, selectedZones)

  const boxSelect = nodes => {
    console.log(nodes)
  }


</script>

<Screen title={$_('Manage Groups')}>
  <div slot='tasks'>
    <ZoneTasks />
  </div>


  <div class='selection-area' on:mousedown={e => startSelection(e, boxSelect)}>
    <div class='group-selector'>
      <div class='tab'>{$_('All Zones')}</div>
      {#each groups as group (group.id)}
        <div class='tab'>{group.name}</div>
      {/each}
    </div>
    <div class='tools'>

      {#if selectedZones.length}
        <span class='link' on:click={clearSelection}>{$_('Clear Selection')}</span>
      {/if}
      <span class='link' on:click={() => creating = true}>{$_('Create Group')}</span>

    </div>
    {#each groups as group (group.id)}
      <ZoneGroup group={group} bind:selection={selection[group.id]}/>
    {/each}
  </div>

</Screen>

{#if creating}
  <Modal onClose={() => creating = false}>
    <GroupForm bind:name={newName} bind:color={newColor} onSubmit={createGroup}/>
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
  }
</style>