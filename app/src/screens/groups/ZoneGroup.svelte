<script>
  import DragHeading from 'components/DragHeading.svelte'
  import _ from 'data/language'
  import _zones from 'data/zones'
  import ZoneButton from './ZoneButton'


  export let group
  export let selection = []

  const toggle = id => {
    if(selection.includes(id)) {
      selection = selection.filter(x => x != id)
    } else {
      selection = selection.concat(id)
    }
  }
  
  $: zones = group.id == 'unassigned' 
    ? $_zones.filter(x => !x.groups || x.groups.length == 0)
    : $_zones.filter(x => x.groups && x.groups.includes(group && group.id)) 
</script>

<div class='zone-group'>
  <DragHeading>{group.name}</DragHeading>
  {#if zones.length == 0}
      <p class='muted'>{$_('No zones have been assigned to this group')}</p>
  {/if}
  <div class='zones'>
    {#each zones as zone (zone.id)}
      <ZoneButton
        zone={zone} 
        active={selection.includes(zone.id)} 
        on:click={() => toggle(zone.id)}
      />
    {/each}
  </div>
  
</div>

<style>
  .muted {
    padding: 16px;
    margin-bottom: 16px;
  }
</style>