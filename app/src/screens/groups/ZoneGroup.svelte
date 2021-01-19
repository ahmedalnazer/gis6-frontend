<script>
  import DragHeading from 'components/DragHeading.svelte'
  import _ from 'data/language'
  import _zones from 'data/zones'
  import ZoneButton from './ZoneButton'
  import groups from 'data/groups'
  import { Collapsible, Icon } from 'components'

  export let group
  export let selection = []

  const toggle = id => {
    if(selection.includes(id)) {
      selection = selection.filter(x => x != id)
    } else {
      selection = selection.concat(id)
    }
  }

  $: console.log($_zones.map(x => x.groups), $groups.map(x => x.id))
  
  $: zones = group.id == 'unassigned' 
    ? $_zones.filter(x => (x.groups || []).map(x => $groups.find(y => y.id == x)).filter(x => !!x).length == 0 )
    : $_zones.filter(x => x.groups && x.groups.includes(group && group.id))

  export let open = true

</script>

<div class='zone-group'>
  <DragHeading><div class='heading' class:open on:click={() => open = !open}>
    <span>{group.name}</span>

    <Icon icon='chevron' />
  </div></DragHeading>
  {#if zones.length == 0}
      <p class='muted'>{$_('No zones have been assigned to this group')}</p>
  {/if}
  
  <Collapsible {open} >
    <div class='zones'>
      {#each zones as zone (zone.id)}
        <ZoneButton
          zone={zone} 
          active={selection.includes(zone.id)} 
          on:click={() => toggle(zone.id)}
        />
      {/each}
    </div>
  </Collapsible>
</div>

<style lang="scss">
  .muted {
    padding: 16px;
    margin-bottom: 16px;
  }
  .heading :global(svg) {
    width: 24px;
    transform: rotate(-90deg);
    transition: transform .3s;
  }
  .heading {
    display:flex;
    justify-content: space-between;
  }
  .heading.open :global(svg) {
    transform: rotate(90deg)
  }
</style>