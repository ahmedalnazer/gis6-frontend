<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  export let onClose

  const standby = zones => {
    console.log(zones)
    // set zones off
  }
</script>

<Modal title={$_('Standby')} {onClose}>
  <Selector onSubmit={standby} onDone={onClose}>
    <h2>Edit</h2>
    Controls
  </Selector>
</Modal>