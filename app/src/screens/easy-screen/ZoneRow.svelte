<script>
  import { Icon, CheckBox } from 'components'
  import _ from 'data/language'
  import { activeSetpointEditor } from 'data/setpoint'
  import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'
  

  export let zone
  export let group = null
  export let active

  const dispatch = createEventDispatcher()

  $: deviation = Math.max(30, zone.DeviationSp || 0)

  $: settings = zone.settings || {}

  $: setpoint = zone.temp_sp ? Math.round(zone.temp_sp / 10) * 10 : zone.ProcessSp

  $: on = settings.on
  $: auto = settings.auto
  $: locked = settings.locked
  $: boost = settings.boost
  $: standby = settings.standby
  $: live =  on && !locked &&  zone.actual_temp !== undefined

  $: falling = auto && live && zone.actual_temp > setpoint + deviation
  $: rising = auto && live && zone.actual_temp < setpoint - deviation

  $: tempWarning = !boost && !standby && (falling || rising)

  $: tempError = zone.hasTempAlarm
  $: powerError = zone.hasPowerAlarm
  let powerWarning = false

  const setPoint = () => {
    selectedZones.set([ zone.id ])
    activeSetpointEditor.set('setpoint')
  }

  let dbl = false
  const click = e => {
    if(!dbl) {
      dbl = true
      dispatch('click', e)
      setTimeout(() => dbl = false, 500)
      return
    }
    setPoint()
  }
</script>


<div class='grid rb-box zone-box' on:click={click} class:active data-id={zone.id} data-group={group && group.id}>
  <div>
    <CheckBox checked={active} /> {zone.name}
  </div>
  <div class:off={!on} class:error={tempError} class:warning={tempWarning}>
    {#if auto}
      {Math.round((zone.actual_temp || 0) / 10)}&deg;
    {:else}
      {((zone.actual_current || 0) / 10).toFixed(1)} A
    {/if}
  </div>
  <div class:off={!on} class:error={powerError} class:warning={powerWarning}>
    {#if on}
      {((zone.actual_percent || 0) / 10).toFixed(1)}%
    {:else}
      <div class='circle' />
    {/if}
  </div>
  <div class='settings' on:click|stopPropagation={setPoint}>
    <Icon icon='edit' color='var(--primary)' />
    {#if auto}
      {setpoint / 10 || '-'}&deg;<span class='temp-type'>F</span>
    {:else}
      {((zone.actual_percent || 0) / 10).toFixed(1)}%
    {/if}
    {#if boost || standby}
      <div class='animated' class:boost class:standby>
        <Icon icon='boost' color='var(--warning)' />
        <Icon icon='boost' color='var(--warning)' />
        <div class='gradient-overlay' />
      </div>
    {/if}

    {#if auto}
      <span>{$_('Auto')}</span>
    {:else}
      <span>{$_('Manual')}</span>
    {/if}
    {#if settings.locked}<span>{$_('Locked')}</span>{/if}
    {#if settings.sealed}<span>{$_('Sealed')}</span>{/if}
  </div>
</div>


<style lang="scss">
  .group-colors {
    display: flex;
  }

  .off {
    background: var(--darkGray);
  }

  .active {
    background: var(--pale);
  }

  .warning {
    background: var(--warning)
  }

  .error {
    background: var(--danger)
  }

  .circle {
    background: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    position: relative;
    bottom: 8px;
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

  .settings {
    display: flex;
  }

</style>