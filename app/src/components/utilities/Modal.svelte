<script>
  import { slide, fade } from 'svelte/transition'
  import { Icon } from 'components'
  export let onClose
  export let title
  import history from 'router/history'

  let route = $history

  $: {
    if($history != route) onClose()
  }
</script>


<div class='modal' transition:fade|local on:click={onClose}>
  <div class='modal-wrapper' on:click|stopPropagation transition:slide|local>
    <div class='modal-header'>
      <div class='header-wrapper'>
        {#if title}
          <h2 class="modal-title">{title}</h2>
        {/if}
        <slot name='header' />
      </div>
      <div class='close' on:click={onClose}>
        <Icon icon='close' />
      </div>
    </div>
    <div class='modal-body'>
      <slot />
    </div>
  </div>
</div>

<style lang="scss">
  .modal {
    position: fixed;
    z-index:999;
    top: 292px;
    left: 0;
    bottom: 120px;
    width: 100%;
    background: rgba(0, 0, 0, .5);
    display: flex;
    align-items: flex-start;
    justify-content: center;

    :global(.modal-buttons) {
      margin-top: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      :global(.button) {
        margin: 32px;
        cursor: pointer;
      }
    }
  }

  .modal-wrapper {
    background: white;
    border-radius: 4px;
    max-height: calc(100vh - 32px);
    overflow: scroll;
    width: 100%;
    margin-top: 0;

    .modal-body, .modal-header {
      padding: 40px;
    }

    .modal-body {
      padding-top: 20px;
    }

    .modal-header {
      padding-bottom: 0;
      :global(.icon) {
        width: 24px;
      }
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

  .modal-title {
    font-size: 26px;
    font-weight: bold;
    line-height: 36px;
  }
</style>

