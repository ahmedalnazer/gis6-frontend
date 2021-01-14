<script>
  import _zones from 'data/zones'
  console.log($_zones)
  export let group
  $: zones = group.id == 'unassigned' 
    ? $_zones.filter(x => x.groups && x.groups.length == 0)
    : $_zones.filter(x => x.groups && x.groups.contains(group && group.id)) 
</script>

<div class='zone-group'>
  <div class='group-heading'>
    {group.name}
  </div>
  <div class='zones'>
    {#each zones as zone (zone.id)}
      <div class='zone'>
        {zone.name || `Zone ${zone.id}`}
      </div>
    {/each}
  </div>
</div>
