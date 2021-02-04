<script>
  import groups from 'data/groups'
  export let zone
  export let active

  let tabs = []

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))

  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]

  let tempWarning = false
  let tempError = false
  let powerWarning = false
  let powerError = false

  $: on = zone.IsZoneOn
  let locked = true

</script>


<div on:click on:dblclick class:active class='zone-box'>
  <div class='group-colors'>
    {#each tabs as t }
      <div class='color-tab' style='background:{t}' />
    {/each}
  </div>
  <div class='details' class:off={!on}>
    {#if !on}
      <div class='overlay' />
    {/if}
    <div class='name'>
      {zone.name}
    </div>
    <div class='temp' class:tempWarning class:tempError>
      <div class='actual'>
        {zone.ProcessSp}&deg;<span class='temp-type'>F</span>
      </div>
      {#if on}
        <div class='setpoint'>
          {zone.ProcessSp || '-'}&deg;<span class='temp-type'>F</span>
        </div>
      {/if}
    </div>
    <div class='power' class:powerWarning class:powerError>
      {#if on}
        <div class='percent'>{(37.0).toFixed(1)}%</div>
        <div class='amps'>{(.4).toFixed(2).padStart(5, '0')} A</div>
      {:else}
        <div class='off-circle'>
          <div class='circle' />
        </div>
      {/if}
    </div>
  </div>
</div>


<style lang="scss">
  .group-colors {
    display: flex;
  }
  .color-tab {
    height: 10px;
    flex: 1;
  }
  .details {
    font-size: .9em;
    position: relative;
  }
  .overlay {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, .5);
  }
  .zone-box {
    background: var(--blue);
    box-shadow: var(--shadow);
    border-radius: 0px 0px 3px 3px;
    margin: 2px;
    margin-bottom: 8px;
    color: white;
  }
  .active {
    border: 2px solid var(--selected);
    margin: 0px;
    margin-bottom: 6px
  }
  .name, .temp, .power {
    padding: 8px;
  }
  .name {
    font-weight: 400;
    padding: 8px;
  }
  .temp, .power {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    min-height: 36px;
    font-weight: 300;
  }

  .tempWarning, .powerWarning {
    background: var(--warning)
  }

  .tempError, .powerError {
    background: var(--danger)
  }

  .temp {
    .actual {
      font-size: 1.3em;
      font-weight: 600;
    }
    .setpoint, .temp-type {
      font-size: 12px;
      font-weight: 400;
    }
  }

  .off .actual {
    padding-left: 8px;
  }

  .power {
    font-size: .9em;
    align-items: center;
  }

  .off-circle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    .circle {
      background: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      position: relative;
      bottom: 8px;
    }
  }

</style>