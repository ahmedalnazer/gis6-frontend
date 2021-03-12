<script>
  import { Modal } from "components"
  import Selector from "components/taskbars/Selector.svelte"
  import _ from "data/language"
  import notify from "data/notifications"
  import { Input, Switch } from "components"
  import { activeSetpointEditor } from 'data/setpoint'
  import Collapsible from "./widgets/Collapsible.svelte"
  import zones, { activeZones } from "data/zones"

  let showAdvanced = false
  let showHideLabel = "Show Advanced Settings"

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

  let tenXfields = [ 'temperature', 'low', 'high', 'manualSp', 'trim', 'wattAlarm', 'criticalOverTemperature' ]

  const commitChanges = async (_zones) => {
    let update = {}
    for(let field of Object.keys(fieldMapping)) {
      if(changed[field]) {
        let data = formData[field]
        if(tenXfields.includes(field)) data = data * 10 
        update[fieldMapping[field]] = data
      }
    }
    await zones.update(_zones, update)
    
    // await Promise.all(_zones.map(async z => {
    //   await zones.update({ ...z, ...update }, { skipReload: true })
    // }))

    // await zones.reload()
    notify.success($_("Changes applied"))
    
  }

  const showHideAdvanced = () => {
    if (showAdvanced) {
      showHideLabel = "Show Advanced Settings"
      showAdvanced = false
    } else {
      showHideLabel = "Hide Advanced Settings"
      showAdvanced = true
    }
  }

  let open = false

  $: {
    if($activeSetpointEditor == "setpoint" && !open) {
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
  }

  const handleZoneChange = () => {
    changed = {}
    let target = $activeZones[0] || $zones[0] || {}
    formData = { ...initialFormData }
    for(let field of Object.keys(fieldMapping)) {
      let data = target[fieldMapping[field]]
      if(tenXfields.includes(field)) data = data / 10
      formData[field] = data
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
       on:setpointZoneChange={handleZoneChange}
    >
      <div class="sp-editor-container">
        <h2>{$_("Edit")}</h2>

        <div class='grid'>
          <Input
            label='{$_("Temperature Setpoint")} (&#176;C)'
            type="number" 
            bind:value={formData.temperature}
            on:change={() => changed.temperature = true}
            changed={changed.temperature}
          />

          <Switch
            changed={changed.manual}
            bind:checked={formData.manual}
            on:change={() => changed.manual = true}
            offLabel={$_("Auto")}
            onLabel={$_("Manual")}
          />

          <Switch
            changed={changed.locked}
            bind:checked={formData.locked}
            on:change={() => changed.locked = true}
            offLabel={$_("Unlock")}
            onLabel={$_("Lock")}
          />

          <Switch
            changed={changed.on}
            bind:checked={formData.on}
            on:change={() => changed.on = true}
          />
        </div>

        <div
            class="advanced-setting-text link"
            on:click={showHideAdvanced}
        >
            <div>{$_(showHideLabel)}</div>
        </div>

        <Collapsible open={showAdvanced}>
          <div class="grid advanced">
            <Input
              label="{$_('Low')} (&#176;C)"
              type="number"
              bind:value={formData.low}
              on:change={() => changed.low= true}
              changed={changed.low}
            />

            <Input
              label="{$_("High")} (&#176;C)"
              type="number"
              bind:value={formData.high}
              on:change={() => changed.high = true}
              changed={changed.high}
            />

            <Switch
              changed={changed.sealed}
              bind:checked={formData.sealed}
              on:change={() => changed.sealed = true}
              offLabel={$_("Unseal")}
              onLabel={$_("Seal")}
            />

            <div class="dummy" />

            <Input
              label={$_("Manual %")}
              type="number"
              changed={changed.manualSp}
              on:change={() => changed.manualSp = true}
              bind:value={formData.manualSp}
            />

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
      </div>
    </Selector>
  </Modal>
{/if}

<style>
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
