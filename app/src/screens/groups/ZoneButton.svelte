<script>

  import groups from 'data/groups'
  import { activeSetpointEditor } from 'data/setpoint'
  import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'
  // import { activeSetpointEditor } from 'data/setpoint'
  export let zone
  export let active
  export let group

  const dispatch = createEventDispatcher()

  let tabs = []

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))

  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]

  let dbl = false
  const click = e => {
    if(!dbl) {
      dbl = true
      dispatch('click', e)
      setTimeout(() => dbl = false, 500)
      return
    }
    selectedZones.set([ zone.id ])
    activeSetpointEditor.set('setpoint')
  }

</script>

<div on:click={click} class:active class='rb-box zone-button' data-id={zone.id} data-group={group && group.id}>
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