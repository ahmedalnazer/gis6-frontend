<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  export let onClose

  const off = zones => {
    console.log(zones)
    // set zones off
  }
</script>

<Modal title={$_('Turn Zones Off')} {onClose}>
  <Selector onSubmit={off} onDone={onClose}/>
</Modal>