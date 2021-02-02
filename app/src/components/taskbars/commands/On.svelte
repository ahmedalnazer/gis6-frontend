<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  import { notify } from 'data'
  export let onClose

  const on = zones => {
    console.log(zones)
    // set zones off
    notify.success($_('Zones turned on'))
  }
</script>

<Modal title={$_('Turn Zones On')} {onClose}>
  <Selector onSubmit={on} onDone={onClose}/>
</Modal>