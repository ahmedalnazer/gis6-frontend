<script>
  import status from 'data/status'
</script>

<header class={$status.level}>
  <div class='logo'>
    LOGO
  </div>

  <div class='status'>
    <div class='status-icon'>

    </div>
    <div class='status-message'>
      {$status.message}
    </div>
  </div>

  <div class='icon'>
    ICON
  </div>
</header>

<style lang="scss">
  header {
    color: white;
    display: flex;
    align-items: center;
    font-size: 1.8em;

    &.info {
      background: var(--green);
    }
    &.warning {
      background: var(--warning);
    }
    &.error {
      background: var(--danger);
    }
  }

  .logo {
    padding: 48px 32px;
    min-height: 96px;
    border-right: 2px solid black;
    margin-right: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status {
    flex: 1;
  }

  .icon {
    padding: 32px;
  }
</style>
