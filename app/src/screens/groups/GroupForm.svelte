<script>
  // import { Input } from 'components'
  // import { defaultNames, groupColors } from "data/groups"
  import CreateGroup from "screens/groups/CreateGroup.svelte"
  import EditGroup from "screens/groups/EditGroup.svelte"
  import _ from "data/language"
  import groups from 'data/groups'

  import zoneTypes from "data/zones/zone-types"
  $: defaultList = $zoneTypes
    .filter(t => !$groups.find(g => g.name == t.name) && t.isVisible).map(x => x.name)


  export let onSubmit
  export let name = ""
  export let color = ""
  export let selectedGroupId = ""
  export let groupList = []
  export let onClose
  export let formType = "CREATE"
  export let selectedGroupItem = ""

  let _zones
  export { _zones as zones }
  /**
   * name and color are bound to vars in the parent component, so all we
   * need to do is update with the user's selections and submit the form (trigger onSubmit)
   */
</script>

<form on:submit|preventDefault={onSubmit}>
  {#if formType == 'EDIT'}
    <h1>{$_('EDIT GROUP')}</h1>
    <EditGroup {groupList} {defaultList} {onClose} bind:name bind:color bind:selectedGroupId bind:selectedGroupItem={selectedGroupItem} />
  {:else}
    <h1>{$_('CREATE GROUP')}</h1>
    <CreateGroup {groupList} {defaultList} {onClose} bind:name bind:color zones={_zones} />
  {/if}
</form>
