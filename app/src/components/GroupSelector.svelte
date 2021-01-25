<script>
  import { onMount } from 'svelte'
  import groups, { activeGroup, group_order, setGroupOrder } from 'data/groups'
  import _ from 'data/language'
  import Sortable from 'sortablejs'

  // $: console.log($groups)

  let selector

  onMount(() => {
    let sortableContainer = Sortable.create(selector, { 
      direction: 'horizontal',
      store: {
        get: sortable => $group_order,
        set: sortable => {
          setGroupOrder(sortable.toArray())
        }
      }
    })
  })
</script>

<div class="group-selector">
  <div
    class="tab"
    on:click={() => activeGroup.set(null)}
    class:active={!$activeGroup}>
    {$_('All Zones')}
  </div>

  <div class='sortable-list' bind:this={selector}>
    {#each $groups as group (group.id)}
      {#if group.id != 'unassigned'}
        <div
          class="tab"
          on:click={() => activeGroup.set(group.id)}
          class:active={$activeGroup == group.id}
          data-id={group.id}
        >
          {group.name}
        </div>
      {/if}
    {/each}
  </div>
</div>


<style lang="scss">
  .group-selector {
    display: flex;
    overflow: auto;
    .sortable-list {
      display: flex;
    }
    .tab {
      padding: 16px 32px;
      white-space: nowrap;
      border: 1px solid var(--darkBlue);
      color: var(--darkBlue);
      background: white;
      &.active {
        background: var(--darkBlue);
        color: white;
      }
    }
  }
</style>