<script>
  import Selector from '../Selector.svelte'
  import { Modal } from 'components'
  import _ from 'data/language'
  import { notify } from 'data'
  import api from 'data/api'

  export let onClose

  const on = async _zones => {
    await api.post('/zones/on', {
      ref_process_id: _zones[0].ref_process,
      zones: _zones.map(x => x.number)
    })
    notify.success($_('Zones turned on'))
  }
</script>

<Modal title={$_('Turn Zones On')} {onClose}>
  <Selector onSubmit={on} onDone={onClose}/>
</Modal>