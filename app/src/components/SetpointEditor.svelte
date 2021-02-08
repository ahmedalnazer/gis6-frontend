<script>
    import { Modal } from "components"
    import Selector from "components/taskbars/Selector.svelte"
    import _ from "data/language"
    import notify from "data/notifications"
    import { Input, CheckBox } from "components"
    import Switch from "svelte-switch"
    import { activeSetpointEditor } from 'data/setpoint'
    import Collapsible from "./widgets/Collapsible.svelte"
    import zones, { activeZones } from "data/zones"
    // import KeypadInput from 'components/input/KeyPad.svelte'

    let checkedValue = true
    let setpointTemperatureValue = 0
    let showAdvanced = false
    let showHideLabel = "Show Advanced Settings"

    let initialFormData = {
      zoneId: 0,
      temperatureSetpoint: 0,
      autoManual: false,
      unlockLock: false,
      onOff: false,
      low: 0,
      high: 0,
      unsealSeal: false,
      manual: 0,
      trim: 0,
      autoStandby: 0,
      tcShortDetectTime: 0,
      tuningOverride: 0,
      powerPriority: 0,
      wattAlarm: 0,
      criticalOverTemperature: 0,
    }

    let formData = { ...initialFormData }

    $: changedTemperatureSetpointData =
        initialFormData.temperatureSetpoint !== formData.temperatureSetpoint
    let changedAutoManualData = false
    let changedUnlockLockData = false
    let changedOnOffData = false
    $: changedLowData = initialFormData.low !== formData.low
    $: changedHighData = initialFormData.high !== formData.high
    $: changedUnsealSealData =
        initialFormData.unsealSeal !== formData.unsealSeal
    $: changedManualData = initialFormData.manual !== formData.manual
    $: changedTrimData = initialFormData.trim !== formData.trim
    $: changedAutoStandbyData =
        initialFormData.autoStandby !== formData.autoStandby
    $: changedTCShortDetectTimeData =
        initialFormData.tcShortDetectTime !== formData.tcShortDetectTime
    $: changedTuningOverrideData =
        initialFormData.tuningOverride !== formData.tuningOverride
    $: changedPowerPriorityData =
        initialFormData.powerPriority !== formData.powerPriority
    $: changedWattAlarmData = initialFormData.wattAlarm !== formData.wattAlarm
    $: changedCriticalOverTemperatureData =
        initialFormData.criticalOverTemperature !==
        formData.criticalOverTemperature


    const commitChanges = (_zones) => {
      let update = {}
      if(changedTemperatureSetpointData) update.ProcessSp = formData.temperatureSetpoint
      if(changedAutoManualData) update.IsManual = formData.autoManual
      if(changedUnlockLockData) update.Islocked = formData.unlockLock
      if(changedOnOffData) update.IsZoneOn = formData.onOff
      if(changedLowData) update.TemperatureLimitSPLow = formData.low
      if(changedHighData) update.TemperatureLimitSPHigh = formData.high
      if(changedUnsealSealData) update.IsSealed = formData.unsealSeal
      if(changedManualData) update.ManualSp = formData.manual
      if(changedTrimData) update.TrimSP = formData.trim
      if(changedAutoStandbyData) update.StandbySp = formData.autoStandby
      if(changedTCShortDetectTimeData) update.ShortDetectTime = formData.tcShortDetectTime
      if(changedTuningOverrideData) update.TuningRangeOverride = formData.tuningOverride
      if(changedPowerPriorityData) update.PowerPrioritySP = formData.powerPriority
      // TODO: There is WattAlarmHigh and WattAlarmLow in the backend. Used high. Needs confirmation.
      if(changedWattAlarmData) update.WattAlarmHigh = formData.wattAlarm
      if(changedCriticalOverTemperatureData) update.CriticalOvertempSp = formData.criticalOverTemperature

      
      for(let z of _zones) {
        zones.update({ ...z, ...update })
      }
      notify.success($_("Changes applied"))
    }


    const handleChangeAutoManual = (e) => {
      const { checked } = e.detail
      formData.autoManual = checked
      changedAutoManualData = true
    }

    const handleUnlockLock = (e) => {
      const { checked } = e.detail
      formData.unlockLock = checked
      changedUnlockLockData = true
    }

    const handleOnOff = (e) => {
      const { checked } = e.detail
      formData.onOff = checked
      changedOnOffData = true
    }

    const handleUnsealSeal = (e) => {
      const { checked } = e.detail
      formData.unsealSeal = checked
    }

    const showHideAdvanced = (showAdv) => {
      if (showAdv) {
        showHideLabel = "Show Advanced Settings"
        showAdvanced = false
      } else {
        showHideLabel = "Hide Advanced Settings"
        showAdvanced = true
      }

      return showAdvanced
    }

    const showDeltaControls = () => {}
</script>

{#if $activeSetpointEditor == "setpoint"}
    <Modal
        title={$_("Setpoint Editor")}
        onClose={() => activeSetpointEditor.set("")}
    >
        <Selector
            trackHistory
            onSubmit={commitChanges}
            onDone={() => activeSetpointEditor.set("")}
        >
            <div class="sp-editor-container">
                <h2>{$_("Edit")}</h2>

                <div class='grid'>
                    <Input
                      label='{$_("Temperature Setpoint")} (&#176;C)'
                      type="number" 
                      bind:value={formData.temperatureSetpoint}
                      changed={changedTemperatureSetpointData}
                    />

                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedAutoManualData == true
                                    ? "changed-chk-data switch-container"
                                    : "not-changed-chk-data switch-container"}
                            >
                                <div class="switch-left-text">{$_("Auto")}</div>
                                <div class="switch-control">
                                    <Switch
                                        on:change={handleChangeAutoManual}
                                        checked={formData.autoManual}
                                        onColor="#358cca"
                                    />
                                </div>
                                <div class="switch-right-text">
                                    {$_("Manual")}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedUnlockLockData == true
                                    ? "changed-chk-data switch-container"
                                    : "not-changed-chk-data switch-container"}
                            >
                                <div class="switch-left-text">
                                    {$_("Unlock")}
                                </div>
                                <div class="switch-control">
                                    <Switch
                                        on:change={handleUnlockLock}
                                        checked={formData.unlockLock}
                                        onColor="#358cca"
                                    />
                                </div>
                                <div class="switch-right-text">
                                    {$_("Lock")}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedOnOffData == true
                                    ? "changed-chk-data switch-container"
                                    : "not-changed-chk-data switch-container"}
                            >
                                <div class="switch-left-text">{$_("On")}</div>
                                <div class="switch-control">
                                    <Switch
                                        on:change={handleOnOff}
                                        checked={formData.onOff}
                                        onColor="#358cca"
                                    />
                                </div>
                                <div class="switch-right-text">{$_("Off")}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="advanced-setting-text link"
                    on:click={() => {
                        showAdvanced = showHideAdvanced(showAdvanced)
                    }}
                >
                    <div>{$_(showHideLabel)}</div>
                </div>

                <Collapsible open={showAdvanced}>
                    <div class="grid advanced">
                        <Input
                          label="{$_('Low')} (&#176;C)"
                          type="number"
                          bind:value={formData.low}
                          changed={changedLowData}
                        />
                        <Input
                          label="{$_("High")} (&#176;C)"
                          type="number"
                          changed={changedHighData}
                          bind:value={formData.high}
                        />
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">&nbsp;</div>
                                <div class="child-label-comp">
                                    <div
                                        class={changedUnsealSealData == true
                                            ? "changed-chk-data switch-container"
                                            : "not-changed-chk-data switch-container"}
                                    >
                                        <div class="switch-left-text">
                                            {$_("Unseal")}
                                        </div>
                                        <div class="switch-control">
                                            <Switch
                                                on:change={handleUnsealSeal}
                                                checked={formData.unsealSeal}
                                                onColor="#358cca"
                                            />
                                        </div>

                                        <div class="switch-right-text">
                                            {$_("Seal")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">&nbsp;</div>
                                <div class="child-label-comp">&nbsp;</div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Manual %")}
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedManualData}
                                        bind:value={formData.manual}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Trim")} (&#176;C)
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedTrimData}
                                        bind:value={formData.trim}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Auto Standby")} (&#176;C)
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedAutoStandbyData}
                                        bind:value={formData.autoStandby}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("T/C Short Detect Time (min)")}
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedTCShortDetectTimeData}
                                        bind:value={formData.tcShortDetectTime}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Tuning Override")}
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedTuningOverrideData}
                                        bind:value={formData.tuningOverride}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Power Priority")}
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedPowerPriorityData}
                                        bind:value={formData.powerPriority}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Watt Alarm (W)")}
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedWattAlarmData}
                                        bind:value={formData.wattAlarm}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Critical Over Temperature")} (&#176;C)
                                </div>
                                <div class="child-label-comp">
                                    <Input
                                        type="number"
                                        changed={changedCriticalOverTemperatureData}
                                        bind:value={formData.criticalOverTemperature}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">&nbsp;</div>
                                <div class="child-label-comp">&nbsp;</div>
                            </div>
                        </div>
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

    .span2 {
        grid-column: span 2;
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

    .child-item {
        /* padding: 10px; */
        background-color: #ffffff;
    }

    .child-label-item {
        font-size: 16px;
        font-weight: 700;
    }

    .child-label-comp {
        padding-top: 15px;
    }

    .changed-data {
        background-color: rgba(53, 138, 188, 0.5);
        border: 1px solid #358cca;
    }

    .changed-chk-data {
        padding: 9px;
        background-color: rgba(53, 138, 188, 0.5);
        border: 1px solid #358cca;
    }

    .not-changed-chk-data {
        padding: 9px;
    }

    .switch-container {
        align-items: center;
        display: flex;
        justify-content: center;
    }

    .switch-left-text {
        align-items: center;
        float: left;
        text-align: right;
        min-width: 50px;
    }
    .switch-control {
        align-items: center;
        float: left;
        padding: 5px;
        text-align: center;
    }
    .switch-right-text {
        align-items: center;
        float: left;
        min-width: 50px;
    }
</style>
