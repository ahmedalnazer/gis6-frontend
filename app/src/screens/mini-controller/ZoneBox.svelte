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

  $: on = settings.on
  // $: on = false //TEST

  $: locked = settings.locked
  // $: locked = true //TEST

  $: boost = settings.boost
  // $: boost = false //TEST

  $: standby = settings.standby
  // $: standby = true //TEST

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

  <div class:tempWarning class:tempError class:powerError class:powerWarning class:tempOff>
    <div class='name'>
      {zone.name}
    </div>

    <div class='icon-legend'>

      <div class='minic-icon-legend'>

        {#if monitor}
          <!-- Monitor -->
          <div class='minic-icon'><Icon icon='zone-operation-monitor' size='22px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
        {:else if auto}
          <!-- Automatic -->
          <div class='minic-icon'><Icon icon='zone-operation-auto' size='25px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
        {:else}
          <!-- Manual -->
          <div class='minic-icon'><Icon icon='zone-operation-manual' size='20px' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
        {/if}

        {#if boost || standby}
          <!-- Boost / Standby -->
          <div class='minic-icon'>
            <div class='animated' class:boost class:standby>
              <Icon icon='boost' color={tempWarning || tempError || tempOff?'var(--pale)': 'var(--warning)'} />
              <Icon icon='boost' color={tempWarning || tempError || tempOff?'var(--pale)': 'var(--warning)'} />

              <!-- <div class={(tempWarning || tempError)?'gradient-overlay-danger': 'gradient-overlay'} /> -->
              <div class={tempWarning? 'gradient-overlay-warning': tempError? 'gradient-overlay-danger': 'gradient-overlay'} />
            </div>
          </div>
        {:else if rising}
            <!-- Boost -->
            <div class='minic-icon'><Icon icon='up' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
        {:else if falling}
            <!-- Temperature above setpoint -->
            <div class='minic-icon'><Icon icon='down' color={tempWarning || tempError || tempOff?'var(--pale)': ''} /></div>
        {:else}
          <div class='minic-icon'>&nbsp;</div>
        {/if}

        {#if settings.locked || settings.sealed}
          {#if settings.locked}
            <!-- Locked -->
            <div class='minic-icon'><Icon icon='lock' color={tempWarning || tempError || tempOff? 'var(--pale)': 'var(--blue)'} /></div>
          {/if}

          {#if settings.sealed}
            <!-- Sealed -->
            <div class='minic-icon'><Icon icon='sealed' color={tempWarning || tempError || tempOff?'var(--pale)': 'var(--blue)'} /></div>
          {/if}
        <!-- {:else}
          <div class='minic-icon'>&nbsp;ff</div> -->
        {/if}

        {#if !on }
          <div class='minic-icon'>
            <div class='icon-container off-circle'>
              <div class='circle' />
            </div>
          </div>
        {/if}

        <!-- Standby -->
        <!-- <div><div class='stacked'><Icon icon='down' /><Icon icon='down' /></div></div> -->

        <!-- Locked -->
        <!-- <div><Icon icon='lock' /></div> -->

        <!-- Sealed -->
        <!-- <div><Icon icon='sealed' /></div> -->

        <!-- Temperature above setpoint -->
        <!-- <div><Icon icon='down' /></div> -->

        <!-- Boost -->
        <!-- <div><div class='stacked'><Icon icon='up' /><Icon icon='up' /></div></div> -->

        <!-- Off -->
        <!-- <div><Icon icon='off' /></div> -->
      </div>

      <div class="tmp">
        <div class='actual'>
          {Math.round((zone.actual_temp || 0) / 10)}&deg;<span class='temp-type-actual'>F</span>
        </div>
        <div class='setpoint'>
          {#if manual}
            <span class='manual'></span>
          {:else}
            <div class="setpoint-ph">{setpoint / 10 || '-'}&deg;<span class='temp-type-'>F</span></div>
          {/if}
        </div>
      </div>
    </div>

    <div class='power'>
      {#if on}
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
  }
  .active {
    border: 4px solid var(--selected);
    margin: 0px;
    margin-bottom: 4px
  }

  .name, .temp, .power, .icon-legend {
    padding: 8px;
  }
  .name {
    font-weight: 400;
    padding: 8px;
  }
  .temp, .tmp, .power, .icon-legend {
    display: flex;
    justify-content: space-between;
    // align-items: flex-end;
    min-height: 36px;
    font-weight: 300;
    transition: background-color .2s;
  }
  .icon-legend {
    min-height: 90px !important;
  }
  .tempOff {
    background: var(--darkGray);
    color:#FFFFFF;
  }

  .tempWarning, .powerWarning {
    background: var(--warning);
    color:#FFFFFF;
  }

  .tempError, .powerError {
    background: var(--danger);
    color:#FFFFFF;
  }

  .temp, .tmp, .icon-legent {
    .actual {
      font-size: 1.3em;
      font-weight: 600;
    }
    .setpoint, .temp-type {
      font-size: 11px;
      font-weight: 400;
      float: right;
      padding-left: 2px;
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
    font-size: .9em;
    align-items: center;
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
    float: left;
    :global(svg) {
      width: 14px;
      height: 14px;
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
    // border: 1px solid #c2c2c2;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    > div {
      display: flex;
      align-items: center;
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

  .minic-icon {
    // border: 1px solid skyblue;
    min-height: 35px;
  }

  .tmp {
    // border: 1px solid #c2c2c2;
    display: grid;
    grid-template-columns: repeat(1, 1fr);
  }
</style>
