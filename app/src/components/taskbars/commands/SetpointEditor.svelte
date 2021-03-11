<script>
  import { onMount } from 'svelte'
  import { Modal } from "components"
  import Selector from "components/taskbars/Selector.svelte"
  import _ from "data/language"
  import notify from "data/notifications"
  import confirm from "data/confirm"
  import { Input, Switch } from "components"
  import { activeSetpointEditor } from 'data/setpoint'
  import Collapsible from "../../widgets/Collapsible.svelte"
  import zones, { activeZones } from "data/zones"
  import ZoneTab from './ZoneTab.svelte'
  import CheckBox from "components/input/CheckBox.svelte"
  import Select from 'components/input/Select.svelte'

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

  // track which fields should be updated
  let changed = {}
  let applied = false

  $: changedFields = Object.entries(changed).filter(([ key, val ]) => val).map(([ key, val ]) => key)

  $: valid = changedFields.length

  const setMode = m => {
    resetFields()
    mode = m
    formData = { ...formData, ...modes[m] }
    changed = { ...changed, manual: true, MonitorEnable: true }
  }

  const resetFields = () => {
    changed = {}
    let target = $activeZones[0] || $zones[0] || {}
    formData = { ...initialFormData }
    for(let field of Object.keys(initialFormData)) {
      const key = fieldMapping[field] || field
      let data = target[key]
      if(tenXfields.includes(field)) data = data / 10
      formData[field] = data
    }

    if(formData.manual) {
      mode = 'manual'
    } else if(formData.MonitorEnable) {
      mode = 'monitor'
    } else {
      mode = 'auto'
    }
  }

  const tuningTypes = [
    { id: 0, name: $_('Min Limit') },
    { id: 5, name: $_('Max Limit') },
    { id: 1, name: $_('Automatic Default') },
    { id: 2, name: $_('Amps') },
    { id: 3, name: $_('Auto Select') },
    { id: 4, name: $_('Automatic') }
  ]


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

    TuningType: 0,
    OutputAttenuationSP: 0,

    MonitorEnable: false,
    MonitorTestHighAlarm: false,
    MonitorTestLowAlarm: false,
    MonitorHighAlarmSP: 0,
    MonitorLowAlarmSP: 0,
    WattAlarmHigh: 0,
    WattAlarmLow: 0,
  }

  let formData = { ...initialFormData }

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
    criticalOverTemperature: 'CriticalOvertempSp'
  }

  let tenXfields = [ 
    'temperature', 'low', 'high', 'manualSp', 'trim', 'wattAlarm', 'criticalOverTemperature',
    'MonitorHighAlarmSP', 'MonitorLowAlarmSP'
  ]

  const commitChanges = async (_zones) => {
    let update = {}
    for(let field of changedFields) {
      const f = fieldMapping[field] || field
      update[f] = formData[field]
      if(tenXfields.includes(field)) update[f] = parseInt(update[f]) * 10 
    }

    await zones.update(_zones, update)

    // await zones.reload()
    applied = true
    notify.success($_("Changes applied"))
    
  }

  const close = async () => {
    if(!valid || applied || await confirm(
      $_('Are you sure you want to close this window without applying the changes?'),
      {
        yes: $_('Yes'),
        no: $_('Back'),
        title: $_('Changes were not applied.')
      }
    )) {
      activeSetpointEditor.set('')
    }
  }


  let open = false
  $: {
    if($activeSetpointEditor == "setpoint" && !open) {
      open = true
      applied = false
      showAdvanced = false
      resetFields()
    }
    if($activeSetpointEditor != 'setpoint') {
      open = false
    }
  }

</script>

{#if $activeSetpointEditor == "setpoint"}
  <Modal
    title={$_("Setpoint Editor")}
    onClose={close}
  >
    <Selector
      trackHistory
      on:change={resetFields}
      onSubmit={commitChanges}
      {valid}
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
                trackChange
                bind:value={formData.temperature}
                bind:changed={changed.temperature}
              />
            {:else}
              <Input
                label={$_("Manual %")}
                type="number"
                trackChange
                bind:changed={changed.manualSp}
                bind:value={formData.manualSp}
              />
            {/if}
            <div class='checkboxes'>
              <CheckBox 
                label={$_('Lock')}
                trackChange
                bind:checked={formData.locked}
                bind:changed={changed.locked}
              />

              <CheckBox 
                label={$_('Seal')}
                trackChange
                bind:checked={formData.sealed}
                bind:changed={changed.sealed}
              />
            </div>

          {:else}

              <Input
                label='{$_("High Alarm Setpoint")} (&#176;C)'
                type="number" 
                trackChange
                bind:value={formData.MonitorHighAlarmSP}
                bind:changed={changed.MonitorHighAlarmSP}
              />

              <Input
                label='{$_("Low Alarm Setpoint")} (&#176;C)'
                type="number" 
                trackChange
                bind:value={formData.MonitorLowAlarmSP}
                bind:changed={changed.MonitorLowAlarmSP}
              />

              <!-- grid placeholders -->
              <div /><div />

              <CheckBox 
                label={$_('Test for high alarm')}
                trackChange
                bind:checked={formData.MonitorTestHighAlarm}
                bind:changed={changed.MonitorTestHighAlarm}
              />

              <CheckBox 
                label={$_('Test for low alarm')}
                trackChange
                bind:checked={formData.MonitorTestLowAlarm}
                bind:changed={changed.MonitorTestLowAlarm}
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
                trackChange
                bind:value={formData.low}
                bind:changed={changed.low}
              />

              <Input
                label="{$_("Deviation High")} (&#176;C)"
                type="number"
                trackChange
                bind:value={formData.high}
                bind:changed={changed.high}
              />

              <!-- grid placeholders -->
              <div /><div />

              {#if mode == 'manual'}
                <Input
                  label='{$_("Temperature Setpoint")} (&#176;C)'
                  type="number" 
                  trackChange
                  bind:value={formData.temperature}
                  bind:changed={changed.temperature}
                />
              {:else if mode == 'auto'}
                <Input
                  label={$_("Manual %")}
                  type="number"
                  trackChange
                  bind:changed={changed.manualSp}
                  bind:value={formData.manualSp}
                />
              {/if}

              <Input
                label='{$_("Trim")} (&#176;C)'
                type="number"
                trackChange
                bind:value={formData.trim}
                bind:changed={changed.trim}
              />

              <Input
                label='{$_("Auto Standby")} (&#176;C)'
                type="number"
                trackChange
                bind:value={formData.autoStandby}
                bind:changed={changed.autoStandby}
              />

              <Input
                label={$_("T/C Short Detect Time (min)")}
                type="number"
                trackChange
                bind:value={formData.tcShortDetectTime}
                bind:changed={changed.tcShortDetectTime}
              />

              <Input
                label={$_("Tuning Override")}
                type="number"
                trackChange
                bind:value={formData.tuningOverride}
                bind:changed={changed.tuningOverride}
              />

              <Select
                label={$_('Tuning Type')}
                trackChange
                options={tuningTypes}
                bind:value={formData.TuningType}
                bind:changed={changed.TuningType}
              />

              <Input
                label={$_("Attenuated Output (%)")}
                type="number"
                trackChange
                bind:value={formData.OutputAttenuationSP}
                bind:changed={changed.OutputAttenuationSP}
              />
              
              <!-- // tuning type? attenuated output -->

              <Input
                label={$_("Power Priority")}
                type="number"
                trackChange
                bind:value={formData.powerPriority}
                bind:changed={changed.powerPriority}
              />

              <Input
                label={$_("Low Watt Alarm (W)")}
                type="number"
                trackChange
                bind:value={formData.WattAlarmLow}
                bind:changed={changed.WattAlarmLow}
              />

              <Input
                label={$_("High Watt Alarm (W)")}
                type="number"
                trackChange
                bind:value={formData.WattAlarmHigh}
                bind:changed={changed.WattAlarmHigh}
              />

              <Input
                label='{$_("Critical Over Temperature")}(&#176;C)'
                type="number"
                trackChange
                bind:value={formData.criticalOverTemperature}
                bind:changed={changed.criticalOverTemperature}
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

  .checkboxes {
    margin-top: auto;
  }
</style>
