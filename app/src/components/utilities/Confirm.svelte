<script>
  import { currentConfirm } from 'data/confirm'
  import Modal from './Modal'

  const confirm = () => {
    $currentConfirm.fn()
    currentConfirm.set(null)
  }

</script>

{#if $currentConfirm}
  <Modal onClose={() => currentConfirm.set(null)}>
    <div class='confirmation-modal'>
      <h3>{$currentConfirm.text}</h3>
      <div class='options'>
        <div class='btn cancel' on:click={() => currentConfirm.set(null)}>Cancel</div>
        <div class='btn confirm' on:click={confirm}>Continue</div>
      </div>
    </div>
  </Modal>
{/if}


<style lang="scss">
  h3 {
    font-size: 20px;
    color: #333;
    padding:16px;
    width: 600px;
    max-width: 90vw;
  }
  .options {
    display: flex;
    justify-content: flex-end;
    .btn {
      cursor: pointer;
    }
    .btn.cancel {
      background: #ccc;
      color: #777;
    }
  }
</style>
