<script>
  import Selector from '../Selector'
  import { Modal } from 'components'
  import _ from 'data/language'
  import { notify } from 'data'
  import zones from 'data/zones'

  export let onClose

  const on = async _zones => {
    await Promise.all(_zones.map(z => {
      return zones.update({...z, IsZoneOn: true}, {skipReload: true})
    }))
    await zones.reload()
    notify.success($_('Zones turned on'))
  }
</script>

<Modal title={$_('Turn Zones On')} {onClose}>
  <Selector onSubmit={on} onDone={onClose}/>
</Modal>