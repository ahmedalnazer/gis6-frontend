<script>
  import Selector from '../Selector.svelte'
  import { Modal } from 'components'
  import _ from 'data/language'
  import { notify } from 'data/'
  import api from 'data/api'

  export let onClose

  const off = async _zones => {
    await api.post('/zones/off', {
      ref_process_id: _zones[0].ref_process,
      zones: _zones.map(x => x.number)
    })
    notify.success(`${$_('Zones turned off')}`)
  }
</script>

<Modal title={$_('Turn Zones Off')} {onClose}>
  <Selector onSubmit={off} onDone={onClose}/>
</Modal>