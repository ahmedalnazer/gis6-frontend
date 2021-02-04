<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  import { notify } from 'data/'
import zones from 'data/zones';
  export let onClose

  const off = async _zones => {
    console.log(zones)
    await Promise.all(_zones.map(z => {
      return zones.update({...z, IsZoneOn: false}, {skipRefresh: true})
    }))
    await zones.reload()
    notify.success(`${$_('Zones turned off')}`)
  }
</script>

<Modal title={$_('Turn Zones Off')} {onClose}>
  <Selector onSubmit={off} onDone={onClose}/>
</Modal>