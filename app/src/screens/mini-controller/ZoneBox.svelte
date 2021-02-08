<script>
  import { Icon } from 'components'
  import groups from 'data/groups'
  export let zone
  export let active

  let tabs = []

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))

  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]

  const isTempBit = i => zone.temp_alarm && zone.temp_alarm[i] == '1'
  const isPowerBit = i => zone.power_alarm && zone.power_alarm[i] == '1'

  $: deviation = Math.max(20, zone.DeviationSp)

  // $: deviationHigh = isTempBit(3)
  // $: deviationLow = isTempBit(4)

  $: live = zone.IsZoneOn && zone.actual_temp !== undefined

  $: deviationHigh = live && zone.actual_temp > zone.ProcessSp + deviation
  $: deviationLow = live && zone.actual_temp < zone.ProcessSp - deviation

  $: tempWarning = deviationHigh || deviationLow
  $: tempError = [ 0, 1, 2, 3, 4, 5, 6, 7, 12, 14, 15 ].reduce((err, bit) => isTempBit(bit) || err, false)
 
  let powerWarning = false
  // $: powerError = zone.power_alarm > 0
  $: powerError = false

  $: on = zone.IsZoneOn
  let locked = true

  // $: console.log(zone.actual_temp, zone.processSp, zone.deviationSp, zone.processSp - zone.deviationSp, deviationHigh, deviationLow)

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
        {Math.round((zone.actual_temp || 0) / 10)}&deg;<span class='temp-type'>F</span>
      </div>
      <div class='deviation-icon'>
        {#if deviationHigh}
          <Icon icon='up' color='white' />
        {/if}
        {#if deviationLow}
          <Icon icon='down' color='white' />
        {/if}
      </div>
      {#if on && zone.IsSealed}
          <div class='icon-container sealed'>
            <div class='sealed-circle'>
              <div class='sealed-line' />
            </div>
          </div>
      {:else if on}
        <div class='setpoint'>
          {zone.ProcessSp && zone.ProcessSp / 10 || '-'}&deg;<span class='temp-type'>F</span>
        </div>
      {/if}
    </div>
    <div class='power' class:powerWarning class:powerError>
      {#if on && zone.Islocked}
        <div class='icon-container'>
          <Icon icon='lock' color='white' />
        </div>
      {:else if on}
        <div class='percent'>{((zone.actual_percent || 0) / 10).toFixed(1)}%</div>
        <div class='amps'>{((zone.actual_current || 0) / 10).toFixed(2).padStart(5, '0')} A</div>
      {:else}
        <div class='icon-container off-circle'>
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
    transition: background-color .2s;
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

  .icon-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    :global(svg) {
      width: 14px;
    }
  }

  .circle {
    background: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    position: relative;
    bottom: 8px;
  }

  .sealed-circle {
    border: 3.2px solid white;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-left: auto;
  }

  .sealed-line {
    height: 18px;
    width: 3.2px;
    background: white;
  }

  .deviation-icon {
    align-self: flex-end;
  }

  .deviation-icon :global(svg) {
    width: 8px;
  }

</style>