<script>
  import { slide, fade } from 'svelte/transition'
  export let onClose
</script>

<div class='modal' transition:fade|local on:click={onClose}>
  <div class='modal-wrapper' on:click|stopPropagation transition:slide|local>
    <div class='modal-header'>
      <div class='header-wrapper'>
        <slot name='header' />
      </div>
      <div class='fa fa-times' on:click={onClose} />
    </div>
    <div class='modal-body'>
      <slot />
    </div>
  </div>
</div>

<style lang="scss">
  .modal {
    position: fixed;
    z-index:99999;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, .3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-wrapper {
    background: white;
    border-radius: 4px;
    max-height: calc(100vh - 32px);
    overflow: scroll;
    .modal-header, .modal-body {
      padding: 16px;
    }

    .modal-header {
      display: flex;
      border-bottom: 1px solid #ddd;
      .header-wrapper {
        flex: 1;
      }
      .fa-times {
        cursor: pointer;
      }
    }

  }
</style>

