<script>
  import { Modal } from 'components'
  import Selector from 'components/taskbars/Selector.svelte'
  import _ from 'data/language'
  import notify from 'data/notifications'

  import { showSetpoint } from 'data/setpoint'

  const commitChanges = zones => {
    notify.success($_('Changes applied'))
  }
</script>

{#if $showSetpoint}
  <Modal title={$_('Setpoint Editor')} onClose={() => showSetpoint.set(false)}>
    <Selector onSubmit={commitChanges}>

      SETPOINT EDITOR HERE

    </Selector>
  </Modal>
{/if}