<script>
  import { currentConfirm } from 'data/confirm'
  import _ from 'data/language'
  import Modal from './Modal.svelte'

  const confirm = () => {
    $currentConfirm.resolve(true)
    currentConfirm.set(null)
  }

  const cancel = () => {
    $currentConfirm.resolve(false)
    currentConfirm.set(null)
  }

  $: ops = $currentConfirm || {}
  $: yes = ops.yes || $_('Continue')
  $: no = ops.no || $_('Cancel')
</script>

{#if $currentConfirm}
  <Modal onClose={cancel} title={ops.title}>
    <div class='confirmation-modal'>
      <h3>{$currentConfirm.text}</h3>
      <div class='options'>
        <div class='button cancel' on:click={cancel}>{no}</div>
        <div class='button active confirm' on:click={confirm}>{yes}</div>
      </div>
    </div>
  </Modal>
{/if}


<style lang="scss">
  h3 {
    font-size: 20px;
  }
  .options {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
  }
  .confirmation-modal {
    min-height: 216px;
    display: flex;
    flex-direction: column;
  }
</style>
