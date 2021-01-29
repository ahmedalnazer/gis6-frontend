<script>
  import Selector from './Selector'
  import { selectedZones } from 'data/zones'
  import { Modal } from 'components'
  export let onClose

</script>

<Modal {onClose}>
  <Selector>
    On Modal
  </Selector>
</Modal>
