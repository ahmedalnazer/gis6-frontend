<script>
  import groups from 'data/groups'
  export let zone
  export let active

  let tabs = []
  $: {
    tabs = []
    for(let x of zone.groups || []) {
      const group = $groups.find(group => x.id == group.id)
      if(group) {
        tabs.push(group.color)
      }
    }
    if(tabs.length == 0) {
      tabs.push('#00E5FF')
    }
  }
</script>

<div on:click class:active class='zone-button'>
  <div class='group-colors'>
    {#each tabs as t }
      <div class='color-tab' style='background:{t}' />
    {/each}
  </div>
  <div class='name'>
    {zone.name}
  </div>
</div>

<style>
  .group-colors {
    display: flex;
  }
  .color-tab {
    height: 10px;
    flex: 1;
  }
  .name {
    padding: 12px 8px;
  }
  .zone-button {
    box-shadow: var(--shadow);
    border-radius: 0px 0px 3px 3px;
    margin-bottom: 8px;
  }
</style>