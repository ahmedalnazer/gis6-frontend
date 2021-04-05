<script>
  import { Icon } from 'components'
  import groups from 'data/groups'
  import { activeSetpointEditor } from 'data/setpoint'
  import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'
  export let zone
  export let group
  export let active

  const dispatch = createEventDispatcher()

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))
  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]

  $: settings = zone.settings || {}

  $: manual = !settings.auto
  $: setpoint = zone.temp_sp ? Math.round(zone.temp_sp / 10) * 10 : zone.ProcessSp

  $: on = settings.on
  $: locked = settings.locked
  $: boost = settings.boost
  $: standby = settings.standby

  $: falling = zone.falling
  $: rising = zone.rising

  $: tempWarning = !boost && !standby && (falling || rising)

  $: tempError = zone.hasTempAlarm
  $: powerError = zone.hasPowerAlarm
  let powerWarning = false

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

  // $: {if(zone.hasTempAlarm || zone.hasPowerAlarm) console.log(zone.alarms)}
</script>


<div on:click={click} class:active class='rb-box zone-box' data-id={zone.id} data-group={group && group.id}>
  <div class='group-colors'>
    {#each tabs as t }
      <div class='color-tab' style='background:{t}' />
    {/each}
  </div>
  <div class='details' class:off={!on}>
    {#if !on && !locked}
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
        {#if boost || standby}
          <div class='animated' class:boost class:standby>
            <Icon icon='boost' color='var(--warning)' />
            <Icon icon='boost' color='var(--warning)' />
            <div class='gradient-overlay' />
          </div>
        {:else}
          {#if rising}
            <Icon icon='up' color='white' />
          {/if}
          {#if falling}
            <Icon icon='down' color='white' />
          {/if}
        {/if}
      </div>
      {#if on && zone.settings.sealed}
          <div class='icon-container sealed'>
            <div class='sealed-circle'>
              <div class='sealed-line' />
            </div>
          </div>
      {:else if on}
        <div class='setpoint'>
          {#if manual}
            <span class='manual'></span>
          {:else}
            {setpoint / 10 || '-'}&deg;<span class='temp-type'>F</span>
          {/if}
        </div>
      {/if}
    </div>
    <div class='power' class:powerWarning class:powerError>
      {#if locked}
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
    margin: 4px;
    margin-bottom: 8px;
    color: white;
  }
  .active {
    border: 4px solid var(--selected);
    margin: 0px;
    margin-bottom: 4px
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
      font-size: 11px;
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

  @keyframes boostAnimation {
    0% {bottom: -100%}
    100% {bottom: 0%}
  }

  .animated {
    display:flex;
    flex-direction: column;
    margin: 2px;
    position: relative;
    overflow: hidden;
    :global(svg) {
      width: 8px;
      height: 8px;
    }
    .gradient-overlay  {
      animation: boostAnimation 1s infinite linear;
      background: linear-gradient(var(--blue), transparent, transparent, var(--blue)) repeat;
      background-size: 100% 50%;
      background-repeat: repeat;
      background-position: 0, 0;
      position:absolute;
      height: 200%;
      width: 100%;
      left: 0;
      bottom: 0%
    }
  }

  .standby.animated {
    transform: rotate(180deg)
  }

</style>