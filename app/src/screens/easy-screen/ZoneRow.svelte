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
  $: boostWarning = settings.boost
  $: standbyError = settings.standby

  $: live =  on && !locked &&  zone.actual_temp !== undefined

  $: falling = auto && live && zone.actual_temp > setpoint + deviation
  $: rising = auto && live && zone.actual_temp < setpoint - deviation

  $: tempWarning = !boost && !standby && (falling || rising)

  $: tempError = zone.hasTempAlarm
  $: powerError = zone.hasPowerAlarm
  let powerWarning = false

  $: monitor = zone.MonitorEnable
  $: monitorHA = zone.MonitorTestHighAlarm
  $: monitorLA = zone.MonitorTestLowAlarm
  $: monitorHSP = zone.MonitorHighAlarmSP
  $: monitorLSP = zone.MonitorLowAlarmSP

  
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
  <div class="table-body-item zone-name">
    <CheckBox checked={active} /> {zone.name}
  </div>

  <div class="table-body-item temp" class:off={!on} class:error={tempError || powerError || standbyError} class:warning={tempWarning || powerWarning || boostWarning}>
    {#if tempWarning || powerWarning}
      <Icon icon="information" color="white" />
    {:else if tempError || powerError}
      <Icon icon="warning" color="white" />
    {/if}

    {#if auto}
      {Math.round((zone.actual_temp || 0) / 10)}&deg;
    {:else}
      {((zone.actual_current || 0) / 10).toFixed(1)} A
    {/if}
  </div>

  <div class="table-body-item" class:off={!on} class:error={powerError || tempError || standbyError} class:warning={powerWarning || tempWarning || boostWarning}>
    {#if monitor}
    <div>
      {#if monitorHA}<span>{$_('High')}&nbsp;</span>{Math.round((monitorHSP || 0) / 10)}&deg;<span class='temp-type'>C</span>{/if}
      {#if monitorHA && monitorLA}<br />{/if}
      {#if monitorLA}<span>{$_('Low')}&nbsp;</span>{Math.round((monitorLSP || 0) / 10)}&deg;<span class='temp-type'>C</span>{/if}
    </div>
    {:else}
      {#if auto}
        <span>{setpoint / 10 || '-'}&deg;<span class='temp-type'>C</span></span>
      {:else}
        <span>{((zone.actual_percent || 0) / 10).toFixed(1)}%</span>
      {/if}
    {/if}
  </div>

  <div class="table-body-item" class:off={!on} class:error={powerError || tempError || standbyError} class:warning={powerWarning || tempWarning || boostWarning}>
    {#if on}
      {#if monitor}
        --
      {:else}
        {((zone.actual_percent || 0) / 10).toFixed(1)}%
      {/if}
    <!-- {:else}
      <div class='circle' /> -->
    {/if}
  </div>
  
  <div class='table-body-item settings' on:click|stopPropagation={setPoint}>
    <div class="settings-indicator">
      {#if monitor}
        <span><Icon icon='zone-operation-monitor' /></span>
      {:else}
        {#if auto}
          <span><Icon icon='zone-operation-auto' /></span>
        {:else}
          <span><Icon icon='zone-operation-manual' /></span>
        {/if}
      {/if}

      {#if boost || standby}
        <div class='animated' class:boost class:standby>
          <Icon icon='boost' color='var(--warning)' />
          <Icon icon='boost' color='var(--warning)' />
          <div class='gradient-overlay' />
        </div>
      {/if}

      {#if settings.locked}<span><Icon icon='lock' /></span>{/if}
      {#if settings.sealed}<span><Icon icon='sealed' /></span>{/if}
    </div>

    <Icon icon='edit' size="24px" color='var(--primary)' />
  </div>
</div>


<style lang="scss">
  .group-colors {
    display: flex;
  }

  .grid {
    div:not(:first-child):not(:last-child) {
      justify-content: flex-end;
    }
  }

  .off {
    background: var(--darkGray);
    color: white !important;
  }

  .active {
    background: var(--pale);
  }

  .warning {
    background: var(--warning);
    color: white !important;
    :global(svg) {
      margin-right: auto;
      transform: scale(1.5);
    }
  }

  .error {
    background: var(--danger);
    color: white !important;
    :global(svg) {
      margin-right: auto;
      transform: scale(1.5);
    }
  }

  .circle {
    background: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
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
      background: linear-gradient(var(--pale), transparent, transparent, var(--pale)) repeat;
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

  .table-body-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 9px 20px;
    font-family: "Open Sans";
    letter-spacing: 0;
    line-height: 22px;
    font-size: 16px;
    color: #011F3E;
  }

  .zone-name {
    justify-content: flex-start;
  }

  .zone-name :global(.input label) {
    margin-bottom: 0;
  }

  .temp {
    font-size: 20px;
    font-weight: bold;
    line-height: 27px;
  }

  .settings {
    color: #358DCA;
    font-weight: 600;
    justify-content: space-between;
    padding-left: 20%;
  }

  .settings :global(svg) {
    margin-right: 20px;
    height: 20px;
    width: 20px;
    color: #358DCA;
  }

</style>