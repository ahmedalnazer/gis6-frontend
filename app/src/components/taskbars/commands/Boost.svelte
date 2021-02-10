<script>
  import Selector from '../Selector'
  import { Modal, Input } from 'components'
  import _ from 'data/language'
  import { notify } from 'data/'
  import activeBoost from 'data/zones/boost';
  export let onClose

  let auto = 104
  let timeout = 0
  let time = 0
  let manualBoost
  let recoveryTime

  const boost = zones => {
    console.log(zones)
    // set zones off
    activeBoost.set(true)
    notify.success($_('Boost applied'))
  }
</script>

<Modal title={$_('Boost')} {onClose}>
  <Selector onSubmit={boost} onDone={onClose}>
    <h2>Edit</h2>
    <div class='grid'>
      <Input type='number' bind:value={auto} label='{$_('Auto Standby')}  (&#176;C)' />
      <Input type='number' bind:value={timeout} label='{$_('Standby Timeout (min)')}' />
      <Input type='number' bind:value={time} label='{$_('Time (sec)')}' />
    </div>

    <div class='grid'>
      <Input type='number' bind:value={manualBoost} label='{$_('Manual Boost')}' />
      <Input type='number' bind:value={recoveryTime} label='{$_('Recovery Time (min)')}' />
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