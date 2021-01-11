<script>
  import { notifications } from 'data/notifications'
  import { slide } from 'svelte/transition'

  const dismiss = id => notifications.update(n => n.filter(x => x.id != id))

  const icons = {
    success: 'check',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle'
  }
</script>

<div class='notifications'>
  <div class='wrapper'>
    {#each $notifications as n (n.id)}
      <div class='notification {n.type}' transition:slide|local on:click={() => dismiss(n.id)}>
      <!-- <i class='fa fa-{icons[n.type] || n.type}' />  -->
      <span class='message'>{n.msg}</span>
      </div>
    {/each}
  </div>
</div>


<style lang="scss">
  .notifications {
    font-size: 16px;
    position: fixed;
    bottom: 180px;
    right: 0;
    width: 100%;
    pointer-events: none;
    z-index: 2;
    .wrapper {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 100%;
    }
    .notification {
      pointer-events: all;
      width: 100%;
      background: #ddd;
      box-shadow: -2px 2px 4px rgba(0, 0, 0, .1);
      border-radius: 4px 0 0 4px;
      margin-bottom: 8px;
      color: white;
      display: flex;
      overflow: hidden;
      text-align: center;
      // > i {
      //   width: 40px;
      //   flex-grow: 0;
      //   flex-shrink: 0;
      //   display: flex;
      //   justify-content: center;
      //   align-items: center;
      //   background: rgba(0, 0, 0, .2);
      // }
      .message {
        flex: 1;
        padding: 16px;
      }
      &.info {
        color: #333
      }
      &.success {
        background: var(--green);
      }
      &.warning {
        background: gold;
      }
      &.error {
        background: var(--danger);
      }
    }
  }
</style>
