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
  // $: on = false //TEST

  $: locked = settings.locked
  // $: locked = true //TEST

  $: boost = settings.boost
  // $: boost = false //TEST

  $: boostWarning = settings.boost

  $: standby = settings.standby
  // $: standby = true //TEST

  $: standbyError = settings.standby
  // $: standbyError = true //TEST

  $: falling = zone.falling
  // $: falling = true //TEST

  $: rising = zone.rising
  // $: rising = true //TEST

  $: tempWarning = !boost && !standby && (falling || rising)
  // $: tempWarning = true

  $: tempError = zone.hasTempAlarm
  // $: tempError = true //TEST

  $: powerError = zone.hasPowerAlarm
  // $: powerError = true //TEST

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

                <!-- <div class={(tempWarning || tempError)?'gradient-overlay-danger': 'gradient-overlay'} /> -->
                <div class={tempWarning || boostWarning? 'gradient-overlay-warning': tempError || standbyError? 'gradient-overlay-danger': 'gradient-overlay'} />
              </div>
              {#if standby}
                <div class='leftPh'></div>
              {/if}
            </div>
          {:else}
            {#if monitor}
              <!-- Monitor -->
              <div class='minic-icon'><Icon icon='zone-operation-monitor' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {:else if auto}
              <!-- Automatic -->
              <div class='minic-icon'><Icon icon='zone-operation-auto' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {:else}
              <!-- Manual -->
              <div class='minic-icon'><Icon icon='zone-operation-manual' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
              <div class='minic-icon'>&nbsp;</div>
            {/if}

            <!-- Locked and Sealed is only in monitor and auto -->
            {#if !monitor}
              {#if settings.locked || settings.sealed}
                {#if settings.locked}
                  <!-- Locked -->
                  <div class='minic-icon'><Icon icon='lock' size='18px' color={tempWarning || tempError || tempOff? 'var(--pale)': 'var(--blue)'} /></div>
                {/if}

                {#if settings.sealed}
                  <!-- Sealed -->
                  <div class='minic-icon'><Icon icon='sealed' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': 'var(--blue)'} /></div>
                {/if}
              {/if}
            {/if}
          {/if}
        
        {/if}

        <!-- {#if rising}
            < !-- Boost -- >
            <div class='minic-icon'><Icon icon='up' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} />Rising</div>
        {:else if falling}
            < !-- Temperature above setpoint -- >
            <div class='minic-icon'><Icon icon='down' size='18px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} />Falling</div>
        {/if} -->



        <!-- {#if !on }
          <div class='minic-icon'>
            <Icon icon='off' size='18px' color={(tempWarning || tempError || tempOff)?'var(--pale)': ''} />
          </div>
        {/if} -->

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
              <div class="setpoint-ph">{setpoint / 10 || '-'}&deg;<span class='temp-type-actual'>C</span></div>
            {:else}
              <div class="setpoint-ph">{Math.round((zone.ManualSp || 0) / 10)}%</div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class='power'>
      <!-- {#if on}
        <div class='percent'>{((zone.actual_percent || 0) / 10).toFixed(1)}%</div>
        <div class='amps'>{((zone.actual_current || 0) / 10).toFixed(2).padStart(5, '0')} A</div>
      {/if} -->
      {#if monitor}
        {#if zone.MonitorTestHighAlarm}
          <div class='amps'>{((zone.MonitorHighAlarmSP || 0) / 10).toFixed(0)}&deg;<span class='temp-type-actual'>C</span></div>
        {:else}
          <div class='amps'>&nbsp;</div>
        {/if}
        {#if zone.MonitorTestLowAlarm}
          <div class='percent'>{((zone.MonitorLowAlarmSP || 0) / 10).toFixed(0)}&deg;<span class='temp-type-actual'>C</span></div>
        {:else}
          <div class='amps'>&nbsp;</div>
        {/if}
      {:else}
        <div class='percent'>{((zone.actual_percent || 0) / 10).toFixed(1)}%</div>
        <div class='amps'>{((zone.actual_current || 0) / 10).toFixed(2).padStart(5, '0')} A</div>
      {/if}
      </div>
  </div>

</div>


<!--
  if !locked
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
    </div> -->


<!-- <div on:click={click} class:active class='rb-box zone-box' data-id={zone.id} data-group={group && group.id}>

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

  <div class='name'>
    {zone.name}
  </div>

  <div class='temp' class:tempWarning class:tempError>

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

      <div class='power' class:powerWarning class:powerError>
        {#if locked}
          <div class='icon-container'>
            <Icon icon='lock' color='var(--blue)' />
          </div>
        {:else}
          <div class='icon-container off-circle'>
            <div class='circle' />
          </div>
        {/if}
      </div>

    </div>

    <div>
      <div class='actual'>
        {Math.round((zone.actual_temp || 0) / 10)}&deg;<span class='temp-type'>F</span>
      </div>
      <div>
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
    </div>

  </div>


  <div class='power' class:powerWarning class:powerError>
    {#if on}
      <div class='percent'>{((zone.actual_percent || 0) / 10).toFixed(1)}%</div>
      <div class='amps'>{((zone.actual_current || 0) / 10).toFixed(2).padStart(5, '0')} A</div>
    {/if}
  </div>

</div> -->

<!-- <div on:click={click} class:active class='rb-box zone-box' data-id={zone.id} data-group={group && group.id}>
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
</div> -->


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
    // background: var(--blue);
    box-shadow: var(--shadow);
    border-radius: 0px 0px 3px 3px;
    margin: 4px;
    margin-bottom: 8px;
    // color: white;
    color: var(--blue);
    // height: 124px;
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
    font-size: 15px;
    font-weight: 400;
    // padding: 8px 8px 8px 8px;
    align-items: center;
  }
  .temp, .tmp, .power, .icon-legend {
    display: flex;
    justify-content: space-between;
    // align-items: flex-end;
    // min-height: 20px;
    font-weight: 300;
    transition: background-color .2s;
  }
  .icon-legend {
    min-height: 73px !important;
    padding-top: 10px;
    // border: 1px solid rgb(127, 210, 216);
    // background-color: indianred;
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
      // font-size: 14px;
      font-size: 1.3em;
      font-weight: 600;
    }
    .setpoint, .temp-type {
      font-size: 14px;
      font-weight: 400;
      float: right;
      padding-left: 2px;
      padding-top: 3px;
    }
    .temp-type-actual {
      font-size: 11px;
      padding-left: 2px;
    }
    .setpoint-ph {
      float: right;
    }
  }

  .off .actual {
    padding-left: 8px;
  }

  .power {
    // font-size: .9em;
    font-size: 14px;
    align-items: center;
    padding-bottom: 5px;
  }

  .icon-container {
    flex: 1;
    display: flex;
    // align-items: center;
    // justify-content: center;
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
    // border: 1px solid #ffffff;
    vertical-align: middle;
    // text-align: center;
    margin: auto;
    // padding-left: 15px;
    float: left;
    :global(svg) {
      width: 14px;
      // height: 14px;
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

  .minic-animated-icon {
    // text-align: center;
    // padding-left: 20px;
    // margin-left: 10px;
    // margin-right: 10px;
    // border: 1px solid indianred;
    // // width: 200px;
    // margin: auto;
    // float: left;
  }

  .standby.animated {
    transform: rotate(180deg)
  }

  .minic-icon-legend {
    // border: 1px solid #c2c2c2;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    > div {
      display: flex;
      // align-items: center;
      padding: 1px 0;
      // padding-left: 12px;
      // border: 1px solid #c2c2c2;
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
      // margin-left: auto;
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
    // border: 1px solid indianred;
  }

  // .minic-icon {
  //   border: 1px solid indianred;
  //   // min-height: 35px;
  // }

  .tmp {
    // border: 1px solid #c2c2c2;
    display: grid;
    grid-template-columns: repeat(1, 1fr);
  }

  // .minic-tile-body {
  //   // border: 1px solid indianred;
  // }
</style>
