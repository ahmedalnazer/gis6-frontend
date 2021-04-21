<script>
  import DragHeading from 'components/DragHeading.svelte'
  import _ from 'data/language'
  import _zones, { selectedZones } from 'data/zones'
  import ZoneRow from './ZoneRow.svelte'
  import groups from 'data/groups'
  import { Collapsible, Icon } from 'components'
  import { CheckBox } from 'components/'

  export let group
  export let selection = []

  const toggle = (id, clear) => {
    if (clear) { selection = []}
    if(selection.includes(id)) {
      selection = selection.filter(x => x != id)
    } else {
      selection = selection.concat(id)
    }
  }

  $: zones = group.id == 'unassigned' 
    ? $_zones.filter(x => (x.groups || []).map(x => $groups.find(y => y.id == x)).filter(x => !!x).length == 0 )
    : $_zones.filter(x => x.groups && x.groups.includes(group && group.id))

  $: allSelected = zones.filter(x => $selectedZones.includes(x.id)).length == zones.length

  const toggleAll = () => {
    if(selection.length) {
      selection = []
    } else {
      selection = zones.map(x => x.id)
    }
  }

  export let open = true

</script>

{#if group.id != 'unassigned' || zones.length}
  <div class='zone-group'>
    <DragHeading><div class='heading' class:open on:click={() => open = !open}>
      <span>{group.name}</span>
      <Icon icon='chevron' />
    </div></DragHeading>
    {#if zones.length == 0}
      <p class='muted'>{$_('No zones have been assigned to this group')}</p>
    {/if}
    
    <Collapsible {open} >
      <div class='table-header-item grid'>
        <div>
          <CheckBox checked={allSelected} minus={selection.length && !allSelected} onClick={toggleAll} label={$_('Zone')} /> 
        </div>
        <div>
          {$_('Actual')}
        </div>
        <div>
          {$_('Output')} (%)
        </div>
        <div>
          {$_('Settings')}
        </div>
      </div>
      {#each zones as zone}
        <ZoneRow
          zone={zone} 
          group={group}
          active={selection.includes(zone.id)} 
          on:click={() => toggle(zone.id)}
        />
      {/each}
    </Collapsible>
  </div>
{/if}


<style lang="scss">
  .zone-group {
    padding-bottom: 16px;
  }
  .muted {
    padding: 16px;
    margin-bottom: 16px;
  }
  .heading :global(svg) {
    width: 12px;
    margin-right: 16px;
  }
  .heading :global(svg:first-of-type) {
    margin-left: auto;
    transform: rotate(-90deg);
    transition: transform .3s;
  }
  .heading {
    display:flex;
  }
  .heading.open :global(svg:first-of-type) {
    transform: rotate(90deg)
  }

  table {
    width: 100%;
  }

  .table-header-item.grid {
    border: none;
    color: #011F3E;
    font-family: "Open Sans";
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 22px;
    div {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    div:first-of-type {
      justify-content: flex-start;
    }
  }

  .zone-group :global(.drag-header) {
    margin-bottom: 0;
  }
</style>