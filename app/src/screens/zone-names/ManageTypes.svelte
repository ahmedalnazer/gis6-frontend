<script>
  import { onMount } from 'svelte'
  import { Modal, CheckBox } from 'components'
  import _ from 'data/language'
  import zoneTypes from 'data/zones/zone-types'
import { notify } from 'data/'

  export let onClose

  $: defaultTypes = $zoneTypes.filter(x => x.isDefault)
  let customTypes = $zoneTypes.filter(x => !x.isDefault)

  let enabled = {}

  let customNames = {}

  let allowCustom = false


  $: {
    if(allowCustom && !customTypes.find(x => x.name === '')) {
      customTypes = customTypes.concat({ name: '' })
    }
  }


  const save = async () => {
    for(let [ id, visible ] of Object.entries(enabled)) {
      const type = $zoneTypes.find(x => x.id == id)
      if(type && type.isVisible != visible) {
        zoneTypes.update({ id, isVisible: visible })
      }
    }
    notify.success($_('Zone Types saved'))
  }
  
  onMount(() => {
    for(let type of $zoneTypes) {
      enabled[type.id] = type.isVisible
    }

    allowCustom = customTypes.length
  })
</script>

<Modal {onClose} title={$_('Manage Zone Types')}>
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
      {#each customTypes as type}
        <CheckBox bind:checked={enabled[type.id]} label={type.name} />
      {/each}
    </div>
  </div>

  <div class='save'>
    <a class='button active' on:click={save}>{$_('Save')}</a>
  </div>
</Modal>


<style>
  .save {
    text-align: right;
  }
</style>