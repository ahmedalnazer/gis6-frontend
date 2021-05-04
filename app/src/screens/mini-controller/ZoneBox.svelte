<script>
  import { Icon } from 'components'
  import groups from 'data/groups'
  import { activeSetpointEditor } from 'data/setpoint'
  import { selectedZones } from 'data/zones'
  import { createEventDispatcher } from 'svelte'
  import _ from "data/language"
  export let zone
  export let group
  export let active

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
  $: setpointmanual = zone.ManualSp

  $: on = settings.on
  $: locked = settings.locked
  $: boost = settings.boost
  $: boostWarning = settings.boost
  $: standby = settings.standby
  $: standbyError = settings.standby
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
  </div>

  <div class:tempWarning class:tempError class:powerError class:powerWarning class:tempOff class:boostWarning class:standbyError class="minic-tile-body">
    <div class='name'>
      {zone.name}
    </div>

    <div class='icon-legend'>

      <div class='minic-icon-legend'>

        {#if tempError}
          <!-- Fault -->
          <Icon icon='warning' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--warning)'} />
        {:else if tempWarning}
          <Icon icon='information' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--warning)'} />
        {:else}

          {#if boost || standby}
            <!-- Boost / Standby -->
            <div class='minic-icon minic-animated-icon'>
              {#if boost}
                <div class='leftPh'></div>
              {/if}
              <div class='animated' class:boost class:standby>
                <Icon icon='boost' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--warning)'} />
                <Icon icon='boost' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--warning)'} />
                <div class={tempWarning || boostWarning? 'gradient-overlay-warning': tempError || standbyError? 'gradient-overlay-danger': 'gradient-overlay'} />
              </div>
              {#if standby}
                <div class='leftPh'></div>
              {/if}
            </div>
          {:else}
            {#if monitor}
              <!-- Monitor -->
              <div class='minic-icon'><Icon icon='zone-operation-monitor' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {:else if auto}
              <!-- Automatic -->
              <div class='minic-icon'><Icon icon='zone-operation-auto' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {:else}
              <!-- Manual -->
              <div class='minic-icon'><Icon icon='zone-operation-manual' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {/if}

            <!-- Locked and Sealed is only in monitor and auto -->
            {#if !monitor}
              {#if settings.locked || settings.sealed}
                {#if settings.locked}
                  <!-- Locked -->
                  <div class='minic-icon'><Icon icon='lock' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--blue)'} /></div>
                {/if}

                {#if settings.sealed}
                  <!-- Sealed -->
                  <div class='minic-icon'><Icon icon='sealed' size='18px' color={tempWarning || tempError || tempOff || boostWarning || standbyError?'var(--pale)': 'var(--blue)'} /></div>
                {/if}
              {/if}
            {/if}
          {/if}
        {/if}

      </div>

      <div class="tmp">
        <div>
          <div class='actual'>
            {Math.round((zone.actual_temp || 0) / 10)}&deg;<span class='temp-type-actual'>C</span>
          </div>
          <div class='setpoint'>
            {#if monitor}
              <span class='monitor'></span>
            {:else if auto}
              <div class="setpoint-ph">{setpoint / 10 || '-'}&deg;<span class='temp-type-sp-actual'>C</span></div>
            {:else}
              <div class="setpoint-ph">{Math.round((zone.ManualSp || 0) / 10)}%</div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class='power'>
      {#if monitor}
        {#if zone.MonitorTestHighAlarm}
          <div class='amps'>
            <Icon icon='uparrow' size='14px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--blue)'} />
            {((zone.MonitorHighAlarmSP || 0) / 10).toFixed(0)}&deg;<span class='temp-type-actual'>C</span>
          </div>
        {:else}
          <div class='amps'>&nbsp;</div>
        {/if}
        {#if zone.MonitorTestLowAlarm}
          <div class='percent'>
        <Icon icon='downarrow' size='14px' color={tempWarning || tempError || tempOff || boostWarning || standbyError? 'var(--pale)': 'var(--blue)'} />
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
    background: var(--white);
    box-shadow: var(--shadow);
    border-radius: 0px 0px 3px 3px;
    margin: 4px;
    margin-bottom: 6px;
    color: var(--blue);
  }
  .active {
    border: 4px solid var(--selected);
    margin: 0px;
    margin-bottom: 4px
  }

  .name, .temp, .power, .icon-legend {
    padding: 2px 8px 2px 8px;
  }
  .name {
    font-size: 11px;
    font-weight: 600;
    align-items: center;
    letter-spacing: 0;
    line-height: 15px;
  }
  .temp, .tmp, .power, .icon-legend {
    display: flex;
    justify-content: space-between;
    font-weight: 300;
    transition: background-color .2s;
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

  .temp, .tmp, .icon-legent {
    .actual {
      font-size: 24px;
      // font-size: 1.4em;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 33px;
      text-align: right;
    }
    .setpoint, .temp-type {
      font-size: 16px;
      font-weight: 600;
      float: right;
      letter-spacing: 0;
      line-height: 22px;
      text-align: right;
    }
    .temp-type-actual {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 33px;
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
    font-size: 14px;
    align-items: center;
    padding-bottom: 5px;
    letter-spacing: 0;
    line-height: 19px;
    text-align: right;
  }

  .icon-container {
    flex: 1;
    display: flex;
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
    width: 14px;
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
    vertical-align: middle;
    margin: auto;
    float: left;
    :global(svg) {
      width: 14px;
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
    .gradient-overlay-danger  {
      animation: boostAnimation 1s infinite linear;
      background: linear-gradient(var(--danger), transparent, transparent, var(--danger)) repeat;
      background-size: 100% 50%;
      background-repeat: repeat;
      background-position: 0, 0;
      position:absolute;
      height: 200%;
      width: 100%;
      left: 0;
      bottom: 0%
    }
    .gradient-overlay-warning {
      animation: boostAnimation 1s infinite linear;
      background: linear-gradient(var(--warning), transparent, transparent, var(--warning)) repeat;
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

  .minic-icon-legend {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    > div {
      display: flex;
      padding: 1px 0;
      font-size: 16px;
      > :first-child {
        margin-right: 0px;
        margin-left: 0px;
      }
    }
    :global(svg) {
      width: 20px;
      margin-right: 12px;
    }

    .circle {
      background: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .sealed-circle {
      border: 3.2px solid var(--blue);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      position: relative;
    }
    .sealed-line {
      height: 18px;
      width: 3.2px;
      background: var(--blue);
    }
    .stacked {
      display: flex;
      flex-direction: column;
    }
  }

  .leftPh {
    display: inline-block;
    width: 15px;
  }

  .tmp {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
  }

  .minic-icon {
    padding-top: 6px !important;
    padding-bottom: 1px !important;
  }
</style>
