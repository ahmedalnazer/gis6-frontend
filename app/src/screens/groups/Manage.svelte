<script>
  import Screen from "layout/Screen"
  import groups from "data/groups"
  import zones from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup"
  import { Modal } from "components"
  import GroupForm from "./GroupForm"
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import { startSelection } from "./selectZones"
  import ZoneButton from "./ZoneButton"
  import { CheckBox } from "components/"
  import ModifyZones from "./ModifyZones"

  let selectedGroup = null
  let sortGroups = true

  $: displayedGroups = selectedGroup
    ? [ selectedGroup ]
    : $groups.concat([ { id: "unassigned", name: "Unassigned" } ])
  // $: console.log(`disp grps: ${displayedGroups}`);
  // $: selectedGroup,     console.log(selectedGroup)

  let creating = false
  let adding = false
  let removing = false
  let editing = false

  let newName, newColor, editGroupId

  // Create group and assign zone
  const createGroup = async () => {
    creating = false
    let newGrp = { name: newName, color: newColor }

    await groups.create(newGrp, { skipReload: true })
    await groups.reload()

    let selGrp = displayedGroups.filter((x) => x.name == newName)
    let _zones = $zones.filter((x) => {
      return activeSelection.includes(x.id)
    })

    for (let z of _zones) {
      z.groups = (z.groups || []).concat(selGrp[0].id)
      z.groups = [ ...new Set(z.groups) ]
      await zones.update(z, { skipReload: true })
    }

    await zones.reload()

    //Reset for next input
    newName = ""
    newColor = ""

    // Clear selection
    clearSelection()
  }

  const editGroup = async () => {
    editing = false
    let editGroupItem = { name: newName, color: newColor, id: editGroupId }

    await groups.update(editGroupItem)
    await groups.reload()
    
    //Reset for next input
    newName = ""
    newColor = ""
  }

  // selection when sorted by groups
  let selection = {}

  // selection when single group or unsorted
  let selectedZoneIds = []

  const clearSelection = () => {
    for (let key of Object.keys(selection)) {
      selection[key] = []
    }
  }

  $: selectedZones = Object.keys(selection)
    .map((x) => selection[x].map((zone) => ({ zone, group: x })))
    .reduce((all, arr) => all.concat(arr), [])

  const toggle = (id) => {
    if (selectedZoneIds.includes(id)) {
      selectedZoneIds = selectedZoneIds.filter((x) => x != id)
    } else {
      selectedZoneIds = selectedZoneIds.concat(id)
    }
  }

  const boxSelect = (nodes) => {
    console.log(nodes)
  }

  $: displayedZones = selectedGroup
    ? $zones.filter((x) => x.groups && x.groups.includes(selectedGroup))
    : $zones

  $: activeSelection =
    selectedGroup || !sortGroups
      ? selectedZoneIds
      : selectedZones.map((x) => x.zone)

  $: zonesToModify = $zones.filter((z) => {
    return activeSelection.includes(z.id)
  })

  const commitModify = () => {
    adding = false
    removing = false
    clearSelection()
  }

  let openGroups = {}
</script>


<Screen title={$_('Manage Groups')} id='group_management'>
  <div slot='tasks'>
    <ZoneTasks />
  </div>

  <div
    class="selection-area"
    on:mousedown={(e) => startSelection(e, boxSelect)}>
    <div class="group-selector">
      <div
        class="tab"
        on:click={() => selectedGroup = null}
        class:active={!selectedGroup}>
        {$_('All Zones')}
      </div>

      {#each $groups as group (group.id)}
        {#if group.id != 'unassigned'}
          <div
            class="tab"
            on:click={() => selectedGroup = group.id}
            class:active={selectedGroup == group.id}>
            {group.name}
          </div>
        {/if}
      {/each}
    </div>
    <div class="tools">
      {#if !selectedGroup}
        <CheckBox label={$_('Show Groups')} bind:checked={sortGroups} />
      {/if}

      {#if selectedZones.length}
        <span
          class="link"
          on:click={clearSelection}>{$_('Clear Selection')}</span>
        <span
          class="link"
          on:click={() => creating = true}>{$_('Create Group')}</span>
        <span
          class="link"
          on:click={() => adding = true}>{$_('Add to Group')}</span>
        <span
          class="link"
          on:click={() => removing = true}>{$_('Remove from Group')}</span>
        <span
          class="link"
          on:click={() => editing = true}>{$_('Edit Group')}</span>
      {:else if (selectedGroup)}
        <span
          class="link"
          on:click={() => editing = true}>{$_('Edit Group')}</span>
      {/if}
    </div>

    <div class='zone-container'>
      {#if !selectedGroup && sortGroups}

        {#each displayedGroups as group (group.id)}
          <ZoneGroup bind:open={openGroups[group.id]} {group} bind:selection={selection[group.id]}/>
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
  </div>
</Screen>

{#if creating}
  <Modal onClose={() => creating = false}>
    <GroupForm
      onClose={() => {
        creating = false
        createGroup()
      }}
      bind:name={newName}
      bind:color={newColor}
      bind:groupList={displayedGroups}
      FormType="CREATE" />
    <!-- onSubmit={createGroup} -->
  </Modal>
{/if}

{#if editing}
  <Modal onClose={() => editing = false}>
    <GroupForm
      onClose={() => {
        editing = false
        editGroup()
      }}
      bind:name={newName}
      bind:color={newColor}
      bind:groupList={displayedGroups}
      formType="EDIT"
      bind:selectedGroupId={editGroupId}
      bind:selectedGroupItem={selectedGroup} />
  </Modal>
{/if}

{#if adding}
  <Modal
    title={$_('Add to Group')}
    onClose={() => {
      clearSelection()
      adding = false
    }}>
    <ModifyZones zones={zonesToModify} onCommit={commitModify} adding />
  </Modal>
{/if}

{#if removing}
  <Modal
    title={$_('Remove from Group')}
    onClose={() => {
      clearSelection()
      removing = false
    }}>
    <ModifyZones zones={zonesToModify} onCommit={commitModify} />
  </Modal>
{/if}


<style lang='scss'>
  :global(#group_management) .screen-body {
    display: flex;
    flex-direction: column;
  }

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

  .tab {
    border: 1px solid var(--darkBlue);
    color: var(--darkBlue);
    &.active {
      background: var(--darkBlue);
      color: white;
    }
  }

  .link {
    cursor: pointer;
  }
</style>
