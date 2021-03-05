<script>
  import { onMount, onDestroy } from 'svelte'
  import { Modal, CheckBox, Input } from 'components'
  import _ from 'data/language'
  import zoneTypes from 'data/zones/zone-types'
  import { notify } from 'data/'

  export let onClose

  $: defaultTypes = $zoneTypes.filter(x => x.isDefault)

  let customTypes = []
  let toDelete = []
  let enabled = {}
  let allowCustom = false

  const loadCustom = zones => {
    customTypes = zones.filter(x => !x.isDefault).map(x => ({ ...x }))
  }

  $: { loadCustom($zoneTypes) }

  $: {
    if(allowCustom && !customTypes.find(x => x.name === '')) {
      customTypes = customTypes.concat({ name: '', isVisible: false })
    }
  }

  let saveActions = []

  const diff = () => {
    let diffs = []
    const ops = { skipReload: true }

    // persist visibility for default types
    for(let [ id, visible ] of Object.entries(enabled)) {
      const type = defaultTypes.find(x => x.id == id)
      if(type && type.isVisible != visible) {
        diffs.push(() => zoneTypes.update({ id, isVisible: visible }, ops))
      }
    }

    // create/update custom zones
    for(let type of customTypes) {
      const current = $zoneTypes.find(x => x.id == type.id)

      // delete empty entries
      if(current && !type.name) {
        diffs.push(() => zoneTypes.delete(type, ops))
        continue
      }

      // ignore new empty entries
      if(type.name) {
        // create/update custom types as needed
        if(!current) {
          diffs.push(() => zoneTypes.create(type, ops))
        } else if(type.name != current.name || type.isVisible != current.isVisible) {
          diffs.push(() => zoneTypes.update(type, ops))
        }
      }
    }

    // remove deleted zone types
    for(let id of toDelete) {
      diffs.push(() => zoneTypes.delete(id, ops))
    }

    saveActions = diffs
  }

  $: {
    if(enabled || customTypes) {
      diff()
    }
  }

  const save = async () => {
    for(let action of saveActions) {
      await action()
    }
    await zoneTypes.reload()
    notify.success($_('Zone Types saved'))
    onClose()
  }


  const del = type => toDelete = toDelete.concat(type.id)

  onMount(() => {
    for(let type of $zoneTypes) {
      enabled[type.id] = type.isVisible
    }
    allowCustom = customTypes.length
  })
</script>

<Modal {onClose} title={$_('Manage Zone Types')}>
  <h3>{$_('Standard Zone Types')}</h3>
  <div class='type-list'>
    {#each defaultTypes as type}
      <div class='type'>
        <CheckBox label={type.name} bind:checked={enabled[type.id]} />
      </div>
    {/each}
  </div>  
  <div class='custom-types'>
    <CheckBox bind:checked={allowCustom} label={$_('Allow Custom Zone Types')} />
    <div class='custom-list'>
      {#each customTypes as type, i}
        {#if !toDelete.includes(type.id)}
          <div class='custom-type'>
            <CheckBox bind:checked={customTypes[i].isVisible} /> <Input bind:value={customTypes[i].name} placeholder={$_('Enter Name')} />
            {#if type.id && type.name && !type.isVisible}
              <a class='delete' on:click={() => del(type)}>{$_('Delete')}</a>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <div class='save'>
    <a class='button active' class:disabled={saveActions.length == 0} on:click={save}>{$_('Save')}</a>
  </div>
</Modal>


<style>
  h3 {
    margin-top: 40px;
    margin-bottom: 30px;
  }
  .save {
    text-align: right;
  }
  .custom-types {
    margin-top: 40px;
    padding-top: 40px;
    border-top: 1px solid var(--gray);
  }
  .custom-list {
    padding-left: 30px;
    margin-top: 10px;
  }
  .custom-type {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  .delete {
    margin-left: 30px;
  }
</style>