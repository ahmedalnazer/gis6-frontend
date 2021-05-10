<script>
  import { Icon } from 'components'
  import groups from 'data/groups'
  import { activeSetpointEditor } from 'data/setpoint'
  import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'
  import _ from "data/language"
  import convert from 'data/language/units'

  export let zone
  export let group = null
  export let active = false
  export let compact = false

  const dispatch = createEventDispatcher()

  $: zoneGroups = $groups.filter(x => zone.groups && zone.groups.includes(x.id))
  $: tabs = zoneGroups.length
    ? zoneGroups.map(x => x.color)
    : [ '#00E5FF' ]

  $: settings = zone.settings || {}

  $: auto = settings.auto
  $: monitor = zone.MonitorEnable
  $: manual = !settings.auto

  $: setpoint = zone.temp_sp ? Math.round(zone.temp_sp / 10) * 10 : zone.ProcessSp
  $: manualSp = zone.ManualSp

  $: on = settings.on

  // locked and sealed ignored for monitor zones
  $: locked = settings.locked && !monitor
  $: sealed = settings.sealed && !monitor

  $: boost = settings.boost
  $: standby = settings.standby
  $: falling = zone.falling
  $: rising = zone.rising
  $: tempWarning = !boost && !standby && (falling || rising)
  $: tempError = zone.hasTempAlarm
  $: powerError = zone.hasPowerAlarm
  $: tempOff = !on

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

  $: danger = tempWarning || tempError || tempOff || boost || standby

  let typeIcon = ''
  $: {
    if(monitor) {
      typeIcon = 'zone-operation-monitor'
    } else {
      typeIcon = auto
        ? 'zone-operation-auto'
        : 'zone-operation-manual'
    }
  }

  $: boostProps = { icon:'boost', size:'18px', color: danger ? 'var(--pale)': 'var(--warning)' }

  $: readout = auto ?  $convert({ type: 'temp', value: zone.actual_temp }) : $convert({ type: 'percent', value: zone.actual_percent })
  $: sp = !monitor && (auto ? $convert({ type: 'temp', value: setpoint, compact }) : $convert({ type: 'percent', value: manualSp }))

</script>

<div on:click={click} class:active class:compact class='rb-box zone-box' data-id={zone.id} data-group={group && group.id}>
  <div class='group-colors'>
    {#each tabs as t }
      <div class='color-tab' style='background:{t}' />
    {/each}
  </div>

  <div class='details' class:off={!on}>
    {#if !on && !locked}
      <div class='overlay' />
    {/if}
  </div>

  <div class='wrapper' class:tempWarning class:tempError class:powerError class:powerWarning class:tempOff class:boostWarning={boost} class:standbyError={standby}>
    <div class='name'>
      {zone.name}
    </div>

    {#if compact}

      <div class='tmp compact'>
        <div class='actual'>{readout}</div>
        <div class='setpoint'>{sp || ''}</div>
      </div>

    {:else}

      <div class='info-wrapper'>
        <div class='icon-grid'>

          {#if tempError}
            <!-- Fault -->
            <Icon icon='warning' size='18px' color={danger ? 'var(--pale)': 'var(--warning)'} />
          {:else if tempWarning}
            <Icon icon='information' size='18px' color={danger ? 'var(--pale)': 'var(--warning)'} />
          {:else if boost || standby}
            <!-- Boost / Standby -->
            <span class='spacer' />
            <div class='animated' class:boost class:standby>
              <Icon {...boostProps} />
              <Icon {...boostProps} />
              <div class='gradient-overlay' class:warning={tempWarning || boost} class:danger={tempError || standby} />
            </div>
          {:else}
            <Icon icon={typeIcon} size='18px' color={danger ? 'var(--pale)': ''} />
            <span class='spacer' />
            {#if locked}
              <Icon icon='lock' size='18px' color={danger ? 'var(--pale)': 'var(--blue)'} />
            {/if}
            {#if sealed}
              <Icon icon='sealed' size='18px' color={danger ? 'var(--pale)': 'var(--blue)'} />
            {/if}
          {/if}

        </div>

        <div class="tmp">
          <div class='actual'>{readout}</div>
          <div class='setpoint'>{sp || ''}</div>
        </div>
      </div>

      <div class='power'>
        {#if monitor}
          {#if zone.MonitorTestHighAlarm}
            <div class='amps'>
              <Icon icon='uparrow' size='14px' color={danger ? 'var(--pale)': 'var(--blue)'} />
              {((zone.MonitorHighAlarmSP || 0) / 10).toFixed(0)}&deg;<span class='temp-type-actual'>C</span>
            </div>
          {:else}
            <div class='amps'>&nbsp;</div>
          {/if}
          {#if zone.MonitorTestLowAlarm}
            <div class='percent'>
              <Icon icon='downarrow' size='14px' color={danger ? 'var(--pale)': 'var(--blue)'} />
              {((zone.MonitorLowAlarmSP || 0) / 10).toFixed(0)}&deg;<span class='temp-type-actual'>C</span>
            </div>
          {:else}
            <div class='amps'>&nbsp;</div>
          {/if}
        {:else}
          <div class='percent'>{((zone.actual_percent || 0) / 10).toFixed(1)}%</div>
          <div class='amps'>{((zone.actual_current || 0) / 10).toFixed(2).padStart(5, '0')}A</div>
        {/if}
      </div>
    {/if}
  </div>
</div>


<style lang="scss">
  .wrapper {
    padding: 8px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .group-colors {
    display: flex;
  }
  .color-tab {
    height: 12px;
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
    background: var(--white);
    box-shadow: var(--shadow);
    border-radius: 0px 0px 3px 3px;
    color: var(--blue);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .active {
    box-shadow: 0 0 0px 4px var(--selected);
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    align-items: center;
    letter-spacing: 0;
    margin-bottom: 8px;
  }
  .icon-legend {
    min-height: 73px !important;
    padding-top: 10px;
  }
  .tempOff {
    background: var(--darkGray);
    color:#FFFFFF;
  }

  .tempWarning, .powerWarning, .boostWarning {
    background: var(--warning);
    color:#FFFFFF;
  }

  .tempError, .powerError, .standbyError {
    background: var(--danger);
    color:#FFFFFF;
  }

  .info-wrapper, .power {
    display: flex;
    justify-content: space-between;
  }

  .temp, .tmp {
    .actual {
      font-size: 24px;
      // font-size: 1.4em;
      font-weight: 600;
      letter-spacing: 0;
      text-align: right;
    }
    .setpoint, .temp-type {
      font-size: 16px;
      font-weight: 600;
      float: right;
      letter-spacing: 0;
      text-align: right;
    }
    .temp-type-actual {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0;
      text-align: right;
    }
    .temp-type-sp-actual {
      font-size: 15px;
    }
    .setpoint-ph {
      float: right;
    }
  }

  .off .actual {
    padding-left: 8px;
  }

  .power {
    margin-top: auto;
    padding-top: 8px;
    font-size: 14px;
    align-items: center;
    padding-bottom: 5px;
    letter-spacing: 0;
    text-align: right;
  }

  .icon-container {
    flex: 1;
    display: flex;
    :global(svg) {
      width: 14px;
    }
  }

  .deviation-icon {
    align-self: flex-end;
  }

  .deviation-icon :global(svg) {
    width: 14px;
  }

  @keyframes boostAnimation {
    0% {bottom: -100%}
    100% {bottom: 0%}
  }

  .animated {
    margin-left: 16px;
    display:flex;
    flex-direction: column;
    margin: 2px;
    position: relative;
    overflow: hidden;
    vertical-align: middle;
    margin: auto;
    :global(svg) {
      width: 14px;
    }
    @mixin gradBG($color) {
      background-image: linear-gradient($color, transparent, transparent, $color);
    }
    .gradient-overlay  {
      @include gradBG(var(--pale));
      animation: boostAnimation 1s infinite linear;
      background-size: 100% 50%;
      background-repeat: repeat;
      background-position: 0, 0;
      position:absolute;
      height: 200%;
      width: 100%;
      left: 0;
      bottom: 0%;

    }
    .gradient-overlay.danger  {
      @include gradBG(var(--danger))
    }
    .gradient-overlay.warning {
      @include gradBG(var(--warning))
    }
  }

  .standby.animated {
    transform: rotate(180deg)
  }

  .stacked {
    display: flex;
    flex-direction: column;
  }

  .tmp.compact {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    .actual {
      font-size: 22px;
    }
    .setpoint {
      font-size: 14px;
      font-weight: 400;
    }
  }

  .icon-grid {
    align-self: flex-start;
    margin-top: 4px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
</style>
