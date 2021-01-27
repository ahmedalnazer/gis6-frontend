<script>
  import groups from 'data/groups'
  export let zone
  export let active

  let tabs = []

  $: zoneGroups = (zone.groups || []).map(x => $groups.find(y => y.id == x)).filter(x => !!x)

  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]
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
    margin: 2px;
    margin-bottom: 8px;
  }
  .active {
    border: 2px solid var(--selected);
    margin: 0px;
    margin-bottom: 6px
  }
</style>