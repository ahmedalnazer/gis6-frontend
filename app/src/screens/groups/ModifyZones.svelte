<script>
  import groups from 'data/groups'
  import _ from 'data/language'
  import zones from 'data/zones'

  let _zones
  export { _zones as zones }
  export let adding = false
  export let onCommit

  let selectedGroups = []
  const toggle = id => {
    if(selectedGroups.includes(id)) {
      selectedGroups = selectedGroups.filter(x => x != id)
    } else {
      selectedGroups = selectedGroups.concat(id)
    }
  }

  const commit = async () => {
    console.log(_zones)
    for(let z of _zones) {
      console.log(z)
      if(adding) {
        z.groups = (z.groups || []).concat(selectedGroups)
      } else {
        z.groups = (z.groups || []).filter(x => !selectedGroups.includes(x))
      }
      z.groups = [ ... new Set(z.groups) ]
      await zones.update(z, { skipReload: true })
    }
    await zones.reload()
    onCommit()
  }

  $: maxGroups = adding ? _zones.map(z => z.groups ? z.groups.length : 0).reduce((max, cur) => cur > max ? cur : max, 0) : 0
  $: console.log(maxGroups)

</script>

<div class='modify-zones'>
  <div class='status-bar'>
    {#if maxGroups >= 3}
      <p class='danger'>Part of your selection is already in the maximum (3) number of groups and cannot be added to another.</p>
    {/if}
  </div>
  
  <div class='group-options'>
    {#each $groups as group (group.id)}
      <div 
        class='button'
        on:click={() => toggle(group.id)}
        class:active={selectedGroups.includes(group.id)}
      >
        {group.name}      
      </div>
    {/each}
  </div>

  <div class='done'>
    <div class='button active' on:click={commit} class:disabled={maxGroups >= 3 || !selectedGroups.length}>
      {$_('Done')}
    </div>
  </div>
</div>

<style>
  .group-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 32px;
  }
  .done {
    text-align: center;
    margin-top: 64px;
  }
  .status-bar {
    min-height: 32px;
    margin-bottom: 32px;
  }
</style>