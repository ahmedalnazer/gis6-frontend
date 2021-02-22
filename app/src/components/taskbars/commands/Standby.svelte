<script>
  import Selector from '../Selector'
  import { Modal, Input } from 'components'
  import _ from 'data/language'
  import { notify } from 'data/'
  import activeStandby from 'data/zones/standby'
  import activeBoost from 'data/zones/boost'

  export let onClose

  let auto = 104
  let timeout = 0

  const standby = zones => {
    if($activeStandby) {
      activeStandby.cancel()
    } else {
      activeStandby.start(zones, auto * 10, {
        StandbyTimeoutSP: timeout,
      })
      if($activeBoost) {
        notify('Boost canceled')
      }
    }
    notify.success($_('Standby applied'))
  }
</script>

<Modal title={$_('Standby')} {onClose}>
  <Selector onSubmit={standby} onDone={onClose}>
    <h2>Edit</h2>
    <div class='grid'>
      <Input type='number' bind:value={auto} label='{$_('Auto Standby')}  (&#176;C)' />
      <Input type='number' bind:value={timeout} label='{$_('Standby Timeout')}  (&#176;C)' />
    </div>
  </Selector>
</Modal>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
</style>