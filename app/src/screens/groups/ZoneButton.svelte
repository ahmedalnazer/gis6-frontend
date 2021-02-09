<script>
  import groups from 'data/groups'
  // import { activeSetpointEditor } from 'data/setpoint'
  export let zone
  export let active
  export let group

  let tabs = []
  // let toggle = key => {
  //   if($activeSetpointEditor == key) {
  //     activeSetpointEditor.set('')
  //   } else {
  //     activeSetpointEditor.set(key)
  //   }
  // }

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))

  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]
</script>

<div on:click on:dblclick class:active class='zone-button' data-id={zone.id} data-group={group && group.id}>
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