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
  $: fieldValueChanges(formData, changedFieldsTemplate)

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

  // track which fields have/should be updated
  let changed = {}
  let applied = false
  let appliedChanges = ''

  // pulled up from the Selector component
  let resetApplied = () => {}

  $: changedFields = Object.entries(changed).filter(([ key, val ]) => val).map(([ key, val ]) => key)
  $: changedFieldsTemplate = Object.entries(changed).filter(([ key, val ]) => val).map(([ key, val ]) => key)

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

    // Clone the init data. Used in undo.
    initialLoadData = { ...formData }
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
  let formDataHistory = []
  let initialLoadData = { ...initialFormData }

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

  const fieldValueChanges = (fldData, changedFieldsTemplate) => {
    changedFieldsTemplate.forEach(d => {
      changed[d] = initialLoadData[d] !== formData[d]
    })
  }

  const commitChanges = async (_zones) => {
    let update = {}
    for(let field of changedFields) {
      const f = fieldMapping[field] || field
      update[f] = formData[field]
      if(tenXfields.includes(field)) update[f] = parseInt(update[f]) * 10 
    }

    formDataHistory.push(update)
    await zones.update(_zones, update)

    // await zones.reload()
    applied = true
    appliedChanges = JSON.stringify(changed)
    notify.success($_("Changes applied"))
  }

  $: {
    if(appliedChanges != JSON.stringify(changed)) resetApplied()
  }

  // Get the last value
  const getHistoryValue = keyName => {
    let keyValue = null
    let historyData = formDataHistory.filter(x => x.hasOwnProperty(keyName))
    if (historyData.length > 0) {
      keyValue = formDataHistory[historyData.length -1]
      keyValue = keyValue[keyName] 
    }

    return keyValue
  }

  // Convert 10x
  const convertTenX = (dataKey, dataValue) => {
    let objValue = dataValue
    if(tenXfields.includes(dataKey)) {
      objValue = parseInt(objValue) / 10
    }
    return objValue
  }

  const undoChanges = async () => {
    let histVals = formDataHistory.pop()
    let histValsPrev = null
    if (formDataHistory.length > 0) { 
      histValsPrev = formDataHistory[formDataHistory.length -1]
    }

    // Compare with the prev arr and find unique key/values
    // History stacks previous change and current change into the latest history change array.
    for(let [ objKey, objValue ] of Object.entries(histVals)) { 

      let isCurrentChange = false
      if (histValsPrev) {
        // If the change is in the previous array then don't process here
        // Let the next undo handle it
        if (!histValsPrev.hasOwnProperty(objKey)) {
          // If the key is not in the previous array then consider it as current change
          isCurrentChange = true
        }
        else if (histValsPrev.hasOwnProperty(objKey)) {
          // If there is key but the value is different then consider it for the current undo
          if (histValsPrev[objKey] !== objValue) {
            isCurrentChange = true
          }
        }
      }
      else {
        isCurrentChange = true
      }

      if (isCurrentChange) {
        let ignoreTenXConversion = false
        let dataKey = ''
        let dataKeyMapped = Object.entries(fieldMapping).filter(([ key, val ]) => val == objKey).map(([ key, val ]) => key)
        dataKey = dataKeyMapped.length > 0? dataKeyMapped[0]: objKey

        if (dataKey !== '') {

          objValue = getHistoryValue(objKey)

          // If there is no history value then get it from the initial value
          if (objValue == null) {
            if (initialLoadData.hasOwnProperty(dataKey)) {
              objValue = initialLoadData[dataKey]
              formData[dataKey] = objValue
              changed[dataKey] = false
              if (dataKey == 'TuningType') {
                // Fix for select changed binding
                setTimeout(() => changed.TuningType = false, 300)
              }
            }
          }            
          else if(tenXfields.includes(dataKey)) {
            formData[dataKey] = convertTenX(dataKey, objValue)
          }
          else {
            formData[dataKey] = objValue
          } 

          if (dataKey == 'manual' || dataKey == 'MonitorEnable' || dataKey == 'auto') {
            if(formData.manual) {
              mode = 'manual'
            } else if(formData.MonitorEnable) {
              mode = 'monitor'
            } else {
              mode = 'auto'
            }
          }
        }
      }
    }
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
      onUndo={undoChanges}
      {valid}
      bind:resetApplied
      manualReadout={mode == 'manual'}
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
