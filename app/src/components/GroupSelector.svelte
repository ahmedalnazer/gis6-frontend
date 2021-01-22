<script>
  import groups, { activeGroup } from 'data/groups'
  import _ from 'data/language'
</script>

<div class="group-selector">
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
        on:click={() => $activeGroup = group.id}
        class:active={$activeGroup == group.id}>
        {group.name}
      </div>
    {/if}
  {/each}
</div>


<style lang="scss">
  .group-selector {
    display: flex;
    overflow: auto;
    .tab {
      padding: 16px 32px;
      white-space: nowrap;
      border: 1px solid var(--darkBlue);
      color: var(--darkBlue);
      &.active {
        background: var(--darkBlue);
        color: white;
      }
    }
  }
</style>