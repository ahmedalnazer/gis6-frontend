<script>
  import status from "data/status";
  import UpdateIcon from "./../style/images/UpdateIcon.svelte";
  import Icon from "components/Icon.svelte";
  import _ from "data/language";
</script>

<header class={$status.level}>
  <div class="logo">
    <div class="homelogo" on:click={() => { window.location.href = '/'}}>
      <Icon icon="homelogo" color="#FFFFFF" />
      <div class="homelogo-text">{$_("Barnes GIS6")}</div>
    </div>
  </div>

  <!-- <a href="/" class="logo">
    <div class="homelogo" on:click={() => console.log("test")}>
      <Icon icon="homelogo" color="#FFFFFF" /> <div class="homelogo-text">{$_('Barnes GIS6')}</div>
    </div>
  </a> -->

  <div class="status">
    <div class="status-icon" />
    <div class="status-message">
      {$status.message}
    </div>
  </div>

  <div class="icon">
    <img src="/images/icons/icon-history.svg" alt="History" />
  </div>
</header>

<style lang="scss">
  header {
    color: white;
    display: flex;
    align-items: center;
    font-size: 1.8em;
    z-index: 2;

    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

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
    cursor: pointer;
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

  .homelogo-text {
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    padding-top: 3px;
  }

  .homelogo {
    text-align: center;
  }
</style>
