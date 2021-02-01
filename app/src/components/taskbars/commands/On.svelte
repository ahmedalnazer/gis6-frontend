<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  export let onClose

  const on = zones => {
    console.log(zones)
    // set zones off
  }
</script>

<Modal title={$_('Turn Zones On')} {onClose}>
  <Selector onSubmit={on} onDone={onClose}/>
</Modal>