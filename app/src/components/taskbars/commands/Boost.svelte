<script>
  import Selector from '../Selector.svelte'
  import { Modal, Input } from 'components'
  import _ from 'data/language'
  import { notify } from 'data/'
  import activeBoost from 'data/zones/boost'
  import activeStandby from 'data/zones/standby'
  import globalSettings from 'data/globalSettings'

  export let onClose
  // const keypadcontrols1 = {
  //   negativeSign: true,
  //   rangeMin: 10,
  //   rangeMax: 20,
  //   decimalPlace: 1,
  // }

  // const keypadcontrols2 = {
  //   rangeMin: 10,
  //   rangeMax: 20,
  //   integerOnly: true,
  // }

  let boostTemp = $globalSettings.BoostTemperatureSP / 10
  let time = $globalSettings.BoostTimeSP / 60
  let manualBoost = $globalSettings.ManualBoostSP / 10
  let recoveryTime = $globalSettings.BoostRecoveryTimeSP / 10

  const boost = zones => {
    activeBoost.start(zones, {
      BoostTemperatureSP: boostTemp * 10,
      BoostTimeSP: time * 60,
      ManualBoostSP: manualBoost * 10,
      BoostRecoveryTimeSP: recoveryTime * 10
    })

    if($activeStandby) {
      notify('Standby canceled')
    }
    notify.success($_('Boost applied'))
  }
</script>

<Modal title={$_('Boost')} {onClose}>
  <Selector onSubmit={boost}>
    <h2>Edit</h2>
    <div class='grid'>
      <!-- <Input type='number' keypadcontrols={keypadcontrols1} bind:value={boostTemp} label='{$_('Boost Amount')}  (&#176;C)' />
      <Input type='number' keypadcontrols={keypadcontrols2} bind:value={time} label='{$_('Boost Time (min)')}' /> -->
      <Input type='number' keypadcontrols={'boostTemperature'} bind:value={boostTemp} label='{$_('Boost Amount')}  (&#176;C)' />
      <Input type='number' keypadcontrols={'manualPercent'} bind:value={time} label='{$_('Boost Time (min)')}' />
      <Input type='number' keypadcontrols={'boostTemperature'} bind:value={recoveryTime} label='{$_('Recovery Time (min)')}' />
    </div>

    <div class='grid'>
      <Input type='number' keypadcontrols={'defaultPercent'} bind:value={manualBoost} label='{$_('Manual Boost (%)')}' />
    </div>
  </Selector>
</Modal>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 30px;
  }
</style>