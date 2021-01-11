<script>
  import status from 'data/status';
  import UpdateIcon from "./../style/images/UpdateIcon.svelte";
</script>

<header class={$status.level}>
  <div class='logo'>
    <img class='logo-image' src="/images/barnes logo-white ball.png" alt="barnes_logo" />
  </div>

  <div class='status'>
    <div class='status-icon'>

    </div>
    <div class='status-message'>
      {$status.message}
    </div>
  </div>

  <div class='icon'>
    <UpdateIcon />
  </div>
</header>

<style lang="scss">
  header {
    // height: 10vh;
    color: white;
    display: flex;
    align-items: center;
    font-size: 1.8em;
    text-align: center;

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

  // .logo_ {
  //   padding: 48px 32px;
  //   min-height: 96px;
  //   border-right: 2px solid black;
  //   margin-right: 32px;
  //   display: flex;
  //   align-items: center;
  //   justify-content: center;
  // }

  .logo {
    // padding: 10px 10px 10px 20px;
    padding: 16px 32px;
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
