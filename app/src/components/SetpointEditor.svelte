<script>
    import { Modal } from "components"
    import Selector from "components/taskbars/Selector.svelte"
    import _ from "data/language"
    import notify from "data/notifications"
    import { Input, CheckBox } from "components"
    import Switch from "svelte-switch"
    import { activeSetpointEditor } from 'data/setpoint'
    import Collapsible from "./widgets/Collapsible.svelte"
    import KeypadInput from 'components/keybodInput/keypadInput.svelte'
    const commitChanges = (zones) => {
      notify.success($_("Changes applied"))
    }

    let checkedValue = true
    let setpointTemperatureValue = 0
    let showAdvanced = false
    let showHideLabel = "Show Advanced Settings"
    let keypadNumber = 0

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

    let changedTemperatureSetpointData = false
    let changedautoManualData = false
    let changedUnlockLockData = false
    let changedOnOffData = false
    let changedLowData = false
    let changedHighData = false
    let changedUnsealSealData = false
    let changedManualData = false
    let changedTrimData = false
    let changedAutoStandbyData = false
    let changedTCShortDetectTimeData = false
    let changedTuningOverrideData = false
    let changedPowerPriorityData = false
    let changedWattAlarmData = false
    let changedCriticalOverTemperatureData = false

    $: changedTemperatureSetpointData =
        initialFormData.temperatureSetpoint !== formData.temperatureSetpoint
    $: changedAutoManualData =
        initialFormData.autoManual !== formData.autoManual
    $: changedUnlockLockData =
        initialFormData.unlockLock !== formData.unlockLock
    $: changedOnOffData = initialFormData.onOff !== formData.onOff
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

    const handleChangeAutoManual = (e) => {
      const { checked } = e.detail
      formData.autoManual = checked
    }

    const handleUnlockLock = (e) => {
      const { checked } = e.detail
      formData.unlockLock = checked
    }

    const handleOnOff = (e) => {
      const { checked } = e.detail
      formData.onOff = checked
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

{#if $activeSetpointEditor == 'setpoint'}
    <Modal
        title={$_("Setpoint Editor")}
        onClose={() => activeSetpointEditor.set('')}
    >
        <Selector trackHistory onSubmit={commitChanges} onDone={() => activeSetpointEditor.set('')}>
            <div class="sp-editor-container">
                <h2>{$_("Edit")}</h2>

                <div class='grid'>
                    <!-- <Input
                      label='{$_("Temperature Setpoint")} (&#176;C)'
                      type="number" 
                      bind:value={formData.temperatureSetpoint}
                      changed={changedTemperatureSetpointData}
                    /> -->
                    <KeypadInput
                        label='{$_("Temperature Setpoint")} (&#176;C)'
                        type="number"
                        changed={changedTemperatureSetpointData}
                        bind:value={keypadNumber}
                    />
                    
                    <!-- <div 
                      class="temperature-setpoint-controls">
                        
                        <div class="child-label-item">
                            {$_("Temperature Setpoint")} (&#176;C)
                        </div>
                        <div class="child-label-comp">
                            <input
                                type="number"
                                class={changedTemperatureSetpointData == true
                                    ? "changed-data"
                                    : "not-changed-data"}
                                bind:value={formData.temperatureSetpoint}
                            />
                        </div>
                    </div> -->
                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedAutoManualData == true
                                    ? "changed-chk-data"
                                    : "not-changed-chk-data"}
                            >
                                <span>{$_("Auto")}</span>
                                <Switch
                                    on:change={handleChangeAutoManual}
                                    checked={formData.autoManual}
                                    onColor="#358cca"
                                />
                                <span>{$_("Manual")}</span>
                            </div>
                        </div>
                    </div>

                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedUnlockLockData == true
                                    ? "changed-chk-data"
                                    : "not-changed-chk-data"}
                            >
                                <span>{$_("Unlock")}</span>
                                <Switch
                                    on:change={handleUnlockLock}
                                    checked={formData.unlockLock}
                                    onColor="#358cca"
                                />
                                <span>{$_("Lock")}</span>
                            </div>
                        </div>
                    </div>

                    <div class="temperature-setpoint-controls">
                        <div class="child-label-item">&nbsp;</div>
                        <div class="child-label-comp">
                            <div
                                class={changedOnOffData == true
                                    ? "changed-chk-data"
                                    : "not-changed-chk-data"}
                            >
                                <span>{$_("On")}</span>
                                <Switch
                                    on:change={handleOnOff}
                                    checked={formData.onOff}
                                    onColor="#358cca"
                                />
                                <span>{$_("Off")}</span>
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
                          label='{$_("Low")} (&#176;C)'
                          type="number" 
                          bind:value={formData.low}
                          changed={changedLowData}
                        />
                        <!-- <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Low")} (&#176;C)
                                </div>
                                <div class="child-label-comp">
                                    <input
                                        type="number"
                                        class={changedLowData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
                                        bind:value={formData.low}
                                    />
                                </div>
                            </div>
                        </div> -->
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("High")} (&#176;C)
                                </div>
                                <div class="child-label-comp">
                                    <input
                                        type="number"
                                        class={changedHighData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
                                        bind:value={formData.high}
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="child span2">
                            <div class="child-item">
                                <div class="child-label-item">&nbsp;</div>
                                <div class="child-label-comp">
                                    <div
                                        class={changedUnsealSealData == true
                                            ? "changed-chk-data"
                                            : "not-changed-chk-data"}
                                    >
                                        <span>{$_("Unseal")}</span>
                                        <Switch
                                            on:change={handleUnsealSeal}
                                            checked={formData.unsealSeal}
                                            onColor="#358cca"
                                        />
                                        <span>{$_("Seal")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">&nbsp;</div>
                                <div class="child-label-comp">&nbsp;</div>
                            </div>
                        </div> -->
                        <div class="child">
                            <div class="child-item">
                                <div class="child-label-item">
                                    {$_("Manual %")}
                                </div>
                                <div class="child-label-comp">
                                    <input
                                        type="number"
                                        class={changedManualData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedTrimData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedAutoStandbyData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedTCShortDetectTimeData ==
                                        true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedTuningOverrideData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedPowerPriorityData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedWattAlarmData == true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
                                    <input
                                        type="number"
                                        class={changedCriticalOverTemperatureData ==
                                        true
                                            ? "changed-data"
                                            : "not-changed-data"}
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
        font-size: 18px;
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
</style>
