<script>
  import _ from "data/language"

  export let zone
</script>


<div class='wrapper'>
  {#if zone}
    <div class='readout'>
      <div class='item'>
        <label>{zone.name}</label>
      </div>
      <div class='item'>
        {$_('Actual')} 
        <span class:danger={zone.hasAlarm} class:warning={zone.hasWarning}>
          {parseInt(zone.actual_temp / 10)}&deg;C
        </span>
      </div>
      <div class='item'>
        {$_('Output')} 
        <span class:danger={zone.hasAlarm} class:warning={zone.hasWarning}>
          {(zone.actual_percent / 10).toFixed(1)}%
        </span>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .wrapper {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .readout {
    border: 1px solid var(--gray);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    font-size: 18px;
  }
  .item {
    padding: 12px;
    padding-right: 0;
    label {
      padding: 0;
      margin: 0;
    }
    span {
      margin-left: 5px;
      font-weight: bold;
      &.danger {
        color: var(--danger)
      }
      &.warning {
        color: var(--warning)
      }
    }
  }
</style>