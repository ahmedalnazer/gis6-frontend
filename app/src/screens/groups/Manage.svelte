<script>
  import { tick } from "svelte"
  import Screen from "layout/Screen"
  import groups, { activeGroup, group_order, setGroupOrder } from "data/groups"
  import zones, { selectedZones as _selected, toggleZones } from "data/zones"
  import _ from "data/language"
  import ZoneGroup from "./ZoneGroup"
  import { Modal, CheckBox } from "components"
  import GroupForm from "./GroupForm"
  import ZoneTasks from "components/taskbars/ZoneTasks"
  import { startSelection } from "./selectZones"
  import ZoneButton from "./ZoneButton"
  import ModifyZones from "./ModifyZones"
  import GroupSelector from "components/GroupSelector.svelte"
  import Sortable from "sortablejs"
  import { activeSetpointEditor } from 'data/setpoint'

  $: selectedGroup = $activeGroup
  $: selectedGroupObj = $groups.filter(x => x.id == selectedGroup)[0]
  let sortGroups = true

  $: displayedGroups = selectedGroup
    ? [ selectedGroup ]
    : $groups.concat([ { id: "unassigned", name: "Unassigned" } ])

  let creating = false
  let adding = false
  let removing = false
  let editing = false
  let deleting = null

  let newName, newColor, editGroupId

  // Create group and assign zone
  const createGroup = async () => {
    creating = false
    let newGrp = { name: newName, color: newColor }
    const g = await groups.create(newGrp, { skipReload: true })
    await groups.reload()

    await groups.addZones(g, $_selected)

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
    for(let [ nodeString, group ] of nodes) {
      const node = parseInt(nodeString)
      if(group) {
        if(selection[group].includes(node)) {
          selection[group] = selection[group].filter(x => x != node)
        } else {
          selection[group].push(node)
        }
      } else {
        
        if($_selected.includes(node)) {
          _selected.update(z => z.filter(x => x != node))
        } else {
          _selected.update(z => z.concat(node))
        }
      }
    }
    selection = selection
  }

  $: displayedZones = selectedGroup
    ? $zones.filter((x) => x.groups && x.groups.includes(selectedGroup))
    : $zones

  $: zonesToModify = $zones.filter(z => $_selected.includes(z.id))

  const commitModify = () => {
    adding = false
    removing = false
    clearSelection()
  }

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

  let toggleSetPoint = key => {
    if($activeSetpointEditor == key) {
      activeSetpointEditor.set('')
    } else {
      activeSetpointEditor.set(key)
    }
  }

</script>

<Screen title={$_("Manage Groups")} id="group_management">
  <div slot="tasks">
    <ZoneTasks />
  </div>

  <div
    class="selection-area"
    on:touchstart={(e) => startSelection(e, boxSelect)}
    on:mousedown={(e) => startSelection(e, boxSelect)}
  >
    <GroupSelector />
    <div class="tools">
      {#if !selectedGroup}
        <CheckBox label={$_("Show Groups")} bind:checked={sortGroups} />
      {/if}

      {#if $_selected.length}
        <span class="link" on:click={clearSelection}
          >{$_("Clear Selection")}</span
        >
        <span class="link" on:click={() => creating = true}
          >{$_("Create Group")}</span
        >
        <span class="link" on:click={() => adding = true}
          >{$_("Add to Group")}</span
        >
        <span class="link" on:click={() => removing = true}
          >{$_("Remove from Group")}</span
        >
        <span class="link" on:click={() => editing = true}
          >{$_("Edit Group")}</span
        >
      {:else if selectedGroup}
        <span class="link" on:click={() => editing = true}
          >{$_("Edit Group")}</span
        >
        <span class="link" on:click={() => deleting = selectedGroupObj}
          >{$_("Delete Group")}</span
        >
      {/if}
    </div>

    <div class="zone-container">
      {#if !selectedGroup && sortGroups}
        <div bind:this={sortList}>
          {#each displayedGroups.filter(x => x.id != 'unassigned') as group (group.id)}
            <div data-id={group.id}>
              <ZoneGroup
                bind:open={openGroups[group.id]}
                {group}
                onDelete={() => deleting = group}
                bind:selection={selection[group.id]}
              />
            </div>
          {/each}
        </div>
        {#each displayedGroups.filter(x => x.id == 'unassigned') as group (group.id)}
            <ZoneGroup
              bind:open={openGroups[group.id]}
              {group}
              onDelete={() => deleting = group}
              bind:selection={selection[group.id]}
              />
        {/each}
      {:else}
        {#if selectedGroup && !displayedZones.length}
          <p class="muted">{$_("No zones have been assigned to this group")}</p>
        {/if}
        <div class="zones">
          {#each displayedZones as zone (zone.id)}
            <ZoneButton
              {zone}
              active={$_selected.includes(zone.id)}
              on:click={() => toggleZones(zone.id)}
              on:dblclick={() => {toggleZones(zone.id); toggleSetPoint('setpoint')}}
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
      zones={zonesToModify}
      FormType="CREATE"
    />
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
      bind:selectedGroupItem={selectedGroup}
    />
  </Modal>
{/if}

{#if deleting}
  <Modal title={$_("Delete Group")} onClose={() => deleting = null}>
    <div class="modal-text">
      <p>
        {$_("Continue and delete the group ")} "{deleting.name}"?
      </p>
      <!-- <p>
        Are you sure you want to delete the {deleting.name} group? This is a permanent
        action and cannot be undone.
      </p> -->

      <div class="modal-buttons">
        <div class="button" on:click={() => deleting = null}>No, take me back</div>
        <div
          class="button active"
          on:click={() => {
            groups.delete(deleting)
            deleting = null
            activeGroup.set(null)
          }}
        >Yes, delete the group</div>
      </div>
    </div>
  </Modal>
{/if}

{#if adding}
  <Modal
    title={$_("Add to Group")}
    onClose={() => {
      clearSelection()
      adding = false
    }}
  >
    <ModifyZones zones={zonesToModify} onCommit={commitModify} adding />
  </Modal>
{/if}

{#if removing}
  <Modal
    title={$_("Remove from Group")}
    onClose={() => {
      clearSelection()
      removing = false
    }}
  >
    <ModifyZones zones={zonesToModify} onCommit={commitModify} />
  </Modal>
{/if}

<style lang="scss">
  :global(#group_management) .screen-body {
    display: flex;
    flex-direction: column;
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

  .link {
    cursor: pointer;
  }

  // .modal {
  //   text-align: center;
  // }

  .modal-text p {
    text-align: left;
    line-height: 27px;
    font-weight: 600;
    font-size: 20px;
    padding-top: 31px;
    padding-bottom: 107px;
  }

  .modal-buttons {
    justify-content: space-between;
    .button {
      margin: 0;
    }
  }

</style>
