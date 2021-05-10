<script>
  import ZoneRow from 'screens/easy-screen/ZoneRow.svelte'
  import zones from 'data/zones'
  import _ from 'data/language'
</script>

<div class='ez'>
  <div class='grid labels'>
    <div class='name'>{$_('Zone')}</div>
    <div class='end'>{$_('Actual')}</div>
    <div class='end'>{$_('Setpoint')}</div>
    <div class='end'>{$_('Output')} (%)</div>
    <div class='settings'>{$_('Zone Settings')}</div>
  </div>
  {#each $zones as z}
    <ZoneRow compact zone={z} />
  {/each}
</div>

<style lang="scss">
  .ez .labels {
    // text-align: center;
    font-size: 16px;
    font-weight: 600;
    border: 0;
    border-top: 1px solid var(--gray);
    > div {
      padding: 16px;
      display: flex;
      &.end {
        justify-content: flex-end;
      }
    }
    .name {
      padding-left: 36px;
    }
    .settings {
      padding-left: 48px;
    }
  }
  .ez :global(.grid) {
    display: grid;
    grid-template-columns: 264px 125px 125px 125px 1fr;
    border: 1px solid #A2A4A8;
    border-bottom: 0px;
    font-size: 16px;
    gap: 0;
  }

  .ez :global(.table-body-item) {
    font-size: 16px;
    padding-right: 16px;
    padding-top: 8px;
    padding-bottom: 8px;
    margin: 0;
  }

  .ez :global(.table-body-item label) {
    height: 100%;
    display: flex;
    align-items: center;
    margin: 0;
    padding-left: 16px;
  }

  .ez :global(.grid:last-child) {
    border-bottom: 1px solid #A2A4A8;
  }
</style>
