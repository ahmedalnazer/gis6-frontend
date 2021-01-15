<script>
  import _zones from 'data/zones'
  import ZoneButton from './ZoneButton'
  export let group
  $: zones = group.id == 'unassigned' 
    ? $_zones.filter(x => !x.groups || x.groups.length == 0)
    : $_zones.filter(x => x.groups && x.groups.contains(group && group.id)) 
</script>

<div class='zone-group'>
  <div class='group-heading'>
    {group.name}
  </div>
  <div class='zones'>
    {#each zones as zone (zone.id)}
      <ZoneButton zone={zone} active={false} />
    {/each}
  </div>
</div>

<style>
  .zones {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-gap: 8px;
  }
</style>
