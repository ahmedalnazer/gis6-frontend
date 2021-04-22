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
  <div class="table-body-item temp" class:off={!on} class:error={tempError} class:warning={tempWarning}>
    {#if auto}
      {Math.round((zone.actual_temp || 0) / 10)}&deg;
    {:else}
      {((zone.actual_current || 0) / 10).toFixed(1)} A
    {/if}
  </div>
  <div class="table-body-item temp" class:off={!on} class:error={powerError} class:warning={powerWarning}>
    {#if on}
      {#if monitor}
        -
      {:else}
        {((zone.actual_percent || 0) / 10).toFixed(1)}%
      {/if}
    {:else}
      <div class='circle' />
    {/if}
  </div>
  <div class='table-body-item settings' on:click|stopPropagation={setPoint}>
    <div class="settings-indicator">
      {#if monitor}
        {#if monitorHA}<span>{$_('High')}&nbsp;</span>{Math.round((monitorHSP || 0) / 10)}&deg;<span class='temp-type'>C</span>{/if}
        {#if monitorHA && monitorLA}&nbsp;-&nbsp;{/if}
        {#if monitorLA}<span>{$_('Low')}&nbsp;</span>{Math.round((monitorLSP || 0) / 10)}&deg;<span class='temp-type'>C</span>{/if}
        {#if monitorHA || monitorLA}&nbsp;|&nbsp;{/if}
      {:else}
        {#if auto}
          {setpoint / 10 || '-'}&deg;<span class='temp-type'>F</span>
        {:else}
          {((zone.actual_percent || 0) / 10).toFixed(1)}%
        {/if}
      {/if}
      {#if boost || standby}
        <div class='animated' class:boost class:standby>
          <Icon icon='boost' color='var(--warning)' />
          <Icon icon='boost' color='var(--warning)' />
          <div class='gradient-overlay' />
        </div>
      {/if}

      {#if monitor}
        <span>{$_('Monitor')}</span>
      {:else}
        {#if auto}
          <span>{$_(' | Auto')}</span>
        {:else}
          <span>{$_(' | Manual')}</span>
        {/if}
      {/if}
      {#if settings.locked}<span>{$_(' | Locked')}</span>{/if}
      {#if settings.sealed}<span>{$_(' | Sealed')}</span>{/if}
    </div>

    <Icon icon='edit' color='var(--primary)' />
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

  .table-body-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
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
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
    margin-right: 2px;
  }

  .settings {
    color: #358DCA;
    font-weight: 600;
    justify-content: space-between;
    padding-left: 20%;
  }

  .settings :global(svg) {
    margin-right: 8px;
    height: 14px;
    width: 14px;
    color: #358DCA;
  }

</style>