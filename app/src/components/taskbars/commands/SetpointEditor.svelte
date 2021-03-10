<script>
  import { Modal } from "components"
  import Selector from "components/taskbars/Selector.svelte"
  import _ from "data/language"
  import notify from "data/notifications"
  import { Input, Switch } from "components"
  import { activeSetpointEditor } from 'data/setpoint'
  import Collapsible from "../../widgets/Collapsible.svelte"
  import zones, { activeZones } from "data/zones"
  import ZoneTab from './ZoneTab.svelte'
  import CheckBox from "components/input/CheckBox.svelte"

  let showAdvanced = false
  $: showHideLabel = showAdvanced ? $_("Hide Advanced Settings") : $_("Show Advanced Settings")

  let mode = 'auto'

  let modes = {
    auto: {
      manual: false,
      MonitorEnable: false
    },
    manual: {
      manual: true,
      MonitorEnable: false
    },
    monitor: {
      manual: false,
      MonitorEnable: true
    }
  }

  const setMode = m => {
    resetFields()
    mode = m
    formData = { ...formData, ...modes[m] }
    changed = { ...changed, manual: true, MonitorEnable: true }
  }


  let initialFormData = {
    temperature: 0,
    manual: false,
    locked: false,
    on: true,
    low: 0,
    high: 0,
    sealed: false,
    manualSp: 0,
    trim: 0,
    autoStandby: 0,
    tcShortDetectTime: 0,
    tuningOverride: 0,
    powerPriority: 0,
    wattAlarm: 0,
    criticalOverTemperature: 0,

    MonitorEnable: false,
    MonitorTestHighAlarm: false,
    MonitorTestLowAlarm: false,
    MonitorHighAlarmSP: 0,
    MonitorLowAlarmSP: 0
  }

  let formData = { ...initialFormData }

  let changed = {}

  const fieldMapping = {
    temperature: 'ProcessSp',
    manual: 'IsManual',
    on: 'IsZoneOn',
    locked: 'Islocked',
    low: 'TemperatureLimitSPLow',
    high: 'TemperatureLimitSPHigh',
    sealed: 'IsSealed',
    manualSp: 'ManualSp',
    trim: 'TrimSP',
    autoStandby: 'StandbySp',
    tcShortDetectTime: 'ShortDetectTime',
    tuningOverride: 'TuningRangeOverride',
    powerPriority: 'PowerPrioritySP',
    wattAlarm: 'WattAlarmHigh',
    criticalOverTemperature: 'CriticalOvertempSp'
  }

  let tenXfields = [ 
    'temperature', 'low', 'high', 'manualSp', 'trim', 'wattAlarm', 'criticalOverTemperature',
    'MonitorHighAlarmSP', 'MonitorLowAlarmSP'
  ]

  const commitChanges = async (_zones) => {
    let update = {}
    for(let field of Object.keys(changed)) {
      const f = fieldMapping[field] || field
      update[f] = formData[field]
      if(tenXfields.includes(field)) update[f] = update[f] * 10 
    }

    console.log(update)
    await zones.update(_zones, update)
    
    // await Promise.all(_zones.map(async z => {
    //   await zones.update({ ...z, ...update }, { skipReload: true })
    // }))

    // await zones.reload()
    notify.success($_("Changes applied"))
    
  }

  const resetFields = () => {
    open = true
    changed = {}
    let target = $activeZones[0] || $zones[0] || {}
    formData = { ...initialFormData }
    for(let field of Object.keys(fieldMapping)) {
      let data = target[fieldMapping[field]]
      if(tenXfields.includes(field)) data = data / 10
      formData[field] = data
    }
  }

  let open = false

  $: {
    if($activeSetpointEditor == "setpoint" && !open) {
      resetFields()
    }
  }
  
  const close = () => {
    activeSetpointEditor.set('')
    open = false
  }
</script>

{#if $activeSetpointEditor == "setpoint"}
  <Modal
    title={$_("Setpoint Editor")}
    onClose={close}
  >
    <Selector
      trackHistory
      onSubmit={commitChanges}
      onDone={close}
      valid={Object.entries(changed).filter(([ key, val ]) => val).length}
    >

      <div class="sp-editor-container">
        <h2>{$_("Edit")}</h2>

        <div class='zone-selection'>
          <label>{$_('Zone Operation')}</label>
          <div class='tabs'>
            <ZoneTab {mode} {setMode} label='auto'> {$_('Auto')} </ZoneTab>
            <ZoneTab {mode} {setMode} label='manual'> {$_('Manual')} </ZoneTab>
            <ZoneTab {mode} {setMode} label='monitor'> {$_('Monitor')} </ZoneTab>
          </div>
        </div>

        <div class='standard grid'>
          {#if [ 'auto', 'manual' ].includes(mode)}

            {#if mode == 'auto'}
              <Input
                label='{$_("Temperature Setpoint")} (&#176;C)'
                type="number" 
                bind:value={formData.temperature}
                on:change={() => changed.temperature = true}
                changed={changed.temperature}
              />
            {:else}
              <Input
                label={$_("Manual %")}
                type="number"
                changed={changed.manualSp}
                on:change={() => changed.manualSp = true}
                bind:value={formData.manualSp}
              />
            {/if}
            <div class='inputs'>
              <CheckBox 
                label={$_('Lock')}
                bind:checked={formData.locked}
                on:change={() => changed.locked = true}
              />

              <CheckBox 
                label={$_('Seal')}
                bind:checked={formData.sealed}
                on:change={() => changed.sealed = true}
              />
            </div>

          {:else}

              <Input
                label='{$_("High Alarm Setpoint")} (&#176;C)'
                type="number" 
                bind:value={formData.MonitorHighAlarmSP}
                on:change={() => changed.MonitorHighAlarmSP = true}
                changed={changed.MonitorHighAlarmSP}
              />

              <Input
                label='{$_("Low Alarm Setpoint")} (&#176;C)'
                type="number" 
                bind:value={formData.MonitorLowAlarmSP}
                on:change={() => changed.MonitorLowAlarmSP = true}
                changed={changed.MonitorLowAlarmSP}
              />

              <!-- grid placeholders -->
              <div /><div />

              <CheckBox 
                label={$_('Test for high alarm')}
                bind:checked={formData.MonitorTestHighAlarm}
                on:change={() => changed.MonitorTestHighAlarm = true}
              />

              <CheckBox 
                label={$_('Test for low alarm')}
                bind:checked={formData.MonitorTestLowAlarm}
                on:change={() => changed.MonitorTestLowAlarm = true}
              />


          {/if}
        </div>

        <!-- <Switch
          changed={changed.on}
          bind:checked={formData.on}
          on:change={() => changed.on = true}
        /> -->

        {#if mode != 'monitor'}
          <div
              class="advanced-setting-text link"
              on:click={() => showAdvanced = !showAdvanced}
          >
              <div>{showHideLabel}</div>
          </div>
          <Collapsible open={showAdvanced}>
            <div class="grid advanced">
              <Input
                label="{$_('Deviation Low')} (&#176;C)"
                type="number"
                bind:value={formData.low}
                on:change={() => changed.low= true}
                changed={changed.low}
              />

              <Input
                label="{$_("Deviation High")} (&#176;C)"
                type="number"
                bind:value={formData.high}
                on:change={() => changed.high = true}
                changed={changed.high}
              />

              <!-- grid placeholders -->
              <div /><div />

              {#if mode == 'manual'}
                <Input
                  label='{$_("Temperature Setpoint")} (&#176;C)'
                  type="number" 
                  bind:value={formData.temperature}
                  on:change={() => changed.temperature = true}
                  changed={changed.temperature}
                />
              {:else if mode == 'auto'}
                <Input
                  label={$_("Manual %")}
                  type="number"
                  changed={changed.manualSp}
                  on:change={() => changed.manualSp = true}
                  bind:value={formData.manualSp}
                />
              {/if}

              <Input
                label='{$_("Trim")} (&#176;C)'
                type="number"
                bind:value={formData.trim}
                on:change={() => changed.trim = true}
                changed={changed.trim}
              />

              <Input
                label='{$_("Auto Standby")} (&#176;C)'
                type="number"
                bind:value={formData.autoStandby}
                on:change={() => changed.autoStandby = true}
                changed={changed.autoStandby}
              />

              <Input
                label={$_("T/C Short Detect Time (min)")}
                type="number"
                bind:value={formData.tcShortDetectTime}
                on:change={() => changed.tcShortDetectTime = true}
                changed={changed.tcShortDetectTime}
              />

              <Input
                label={$_("Tuning Override")}
                type="number"
                bind:value={formData.tuningOverride}
                on:change={() => changed.tuningOverride = true}
                changed={changed.tuningOverride}
              />
              
              <!-- // tuning type? attenuated output -->

              <Input
                label={$_("Power Priority")}
                type="number"
                bind:value={formData.powerPriority}
                on:change={() => changed.powerPriority = true}
                changed={changed.powerPriority}
              />

              <Input
                label={$_("Watt Alarm (W)")}
                type="number"
                bind:value={formData.wattAlarm}
                on:change={() => changed.wattAlarm = true}
                changed={changed.wattAlarm}
              />

              <Input
                label='{$_("Critical Over Temperature")}(&#176;C)'
                type="number"
                bind:value={formData.criticalOverTemperature}
                on:change={() => changed.criticalOverTemperature = true}
                changed={changed.criticalOverTemperature}
              />
            </div>
          </Collapsible>
        {/if}
      </div>
    </Selector>
  </Modal>
{/if}

<style>
  h2 {
    margin-bottom: 16px;
  }
  .tabs {
    display: flex;
    margin-bottom: 40px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    align-items: center;
}

  .grid :global(input) {
    width: 100%;
  }

  .grid {
    box-sizing: border-box;
  }

  .advanced-setting-text {
    display: block;
    clear: both;
    cursor: pointer;
    padding-top: 20px;
  }

  .advanced {
    padding-top: 36px;
  }

  .grid :global(.switch-container) {
    margin-top: auto;
    justify-content: auto;
  }
</style>
