<script>
  import status from 'data/status';
  import UpdateIcon from "./../style/images/UpdateIcon.svelte";
</script>

<header class={$status.level}>
  <a href='/' class='logo'>
    <img class='logo-image' src="/images/barnes logo-white ball.png" alt="barnes_logo" />
  </a>

  <div class='status'>
    <div class='status-icon'>

    </div>
    <div class='status-message'>
      {$status.message}
    </div>
  </div>

  <div class='icon'>
    <img src='/images/icons/icon-history.svg' />
  </div>
</header>

<style lang="scss">
  header {
    color: white;
    display: flex;
    align-items: center;
    font-size: 1.8em;
    z-index: 2;

    box-shadow: 0 2px 4px rgba(0, 0, 0, .3);

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

  .status-message {
    font-weight: 600;
  }

  .logo {
    // padding: 10px 10px 10px 20px;
    padding: 36px 40px;
    min-height: 96px;
    border-right: 2px solid black;
    margin-right: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-image {
    max-width: 48px;
  }

  .status {
    flex: 1;
  }

  .icon {
    padding: 32px;
  }
</style>
