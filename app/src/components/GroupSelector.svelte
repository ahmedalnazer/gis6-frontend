<script>
  import { tick } from 'svelte'
  import groups, { activeGroup, group_order, setGroupOrder } from 'data/groups'
  import _ from 'data/language'
  import Sortable from 'sortablejs'

  // $: console.log($groups)

  let selector, sortable

  const resetSortable = async () => {
    await tick()
    if(sortable) sortable.destroy()
    sortable = Sortable.create(selector, {
      store: {
        get: s => $group_order,
        set: s => setGroupOrder(s.toArray())
      }
    })
  }

  $: {
    if(selector && $group_order) {
      resetSortable()
    }
  }
</script>

<div class="group-selector">
  <!-- <div
    class="tab"
    on:click={() => activeGroup.set(null)}
    class:active={!$activeGroup}>
    {$_('All Zones')}
  </div> -->

  <div class='sortable-list' bind:this={selector}>
    <div
      class="tab"
      on:click={() => activeGroup.set(null)}
      class:active={!$activeGroup}>
      {$_('All Zones')}
    </div>
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
      flex-wrap: wrap;
      cursor: pointer;
    }
    .tab {
      padding: 16px 32px;
      white-space: nowrap;
      border: 1px solid var(--darkBlue);
      color: var(--darkBlue);
      background: white;
      min-width: 166px;
      text-align: center;
      // margin: 1px;
      &.active {
        background: var(--darkBlue);
        color: white;
      }
    }
  }
</style>