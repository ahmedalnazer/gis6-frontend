<script>
  import { notifications } from 'data/notifications'
  import { slide } from 'svelte/transition'
  import { Icon } from 'components'

  const dismiss = id => notifications.update(n => n.filter(x => x.id != id))

  const icons = {
    success: {
      icon: 'check',
      color: 'var(--green)'
    },
    error: {},
    warning: {},
    info: {}
  }
</script>

<div class='notifications'>
  <div class='wrapper'>
    {#each $notifications as n (n.id)}
      <div class='notification {n.type}' transition:slide|local on:click={() => dismiss(n.id)}>
        <Icon icon={icons[n.type].icon} color={icons[n.type].color}/>
        <span class='message'>{n.msg}</span>
        <div class='close'>
          <Icon icon='close' />
        </div>
      </div>
    {/each}
  </div>
</div>


<style lang="scss">
  .notifications {
    font-size: 16px;
    font-weight: 600;
    position: fixed;
    top: 284px;
    right: 0;
    width: 100%;
    pointer-events: none;
    z-index: 9999;
    .wrapper {
      position: absolute;
      top:0;
      left: 0;
      width: 100%;
    }
  }

  .notification {
    pointer-events: all;
    width: 100%;
    background: white;
    box-shadow: -2px 2px 4px rgba(0, 0, 0, .4);
    border-radius: 4px 0 0 4px;
    margin-bottom: 8px;
    color: white;
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 0 64px;
    .message {
      padding: 48px 10px;;
    }
    &.info {
      color: #333
    }
    &.success {
      color: var(--green);
    }
    &.warning {
      color: gold;
    }
    &.error {
      color: var(--danger);
    }
  }

  .close {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding-right: 40px;
    :global(svg) {
      width: 24px;
    }
  }
</style>
