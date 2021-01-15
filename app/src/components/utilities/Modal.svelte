<script>
  import { slide, fade } from 'svelte/transition'
  export let onClose
  export let title
</script>


<div class='modal' transition:fade|local on:click={onClose}>
  <div class='modal-wrapper' on:click|stopPropagation transition:slide|local>
    <div class='modal-header'>
      <div class='header-wrapper'>
        {#if title}
          <h2>{title}</h2>
        {/if}
        <slot name='header' />
      </div>
      <div class='close' on:click={onClose}>X</div>
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
    align-items: flex-start;
    justify-content: center;
  }
  .modal-wrapper {
    background: white;
    border-radius: 4px;
    max-height: calc(100vh - 32px);
    overflow: scroll;
    width: 100%;
    margin-top: 240px;

    .modal-body, .modal-header {
      padding: 32px;
    }

    .modal-header {
      padding-bottom: 0;
    }

    .modal-header {
      display: flex;
      padding-bottom: 0;
      .header-wrapper, h2 {
        flex: 1;
        margin: 0;
      }
    }
  }
</style>

