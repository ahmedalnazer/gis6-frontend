<script>
  import user from "data/user";
  import language from "data/language/current";
  import _ from "data/language";
  import { Collapsible } from "components";
  import mold from "data/mold";
  import process from "data/process";
  import time from "data/time";

  const dateOptions = { year: "numeric", month: "short", day: "numeric" };

  // for testing
  const dummyUser = { name: "MJacobi" };
</script>

<style lang="scss">
  footer {
    // height: 10vh;
    padding: 5px;
    background: var(--blue);
    text-align: left;
    .container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);

      color: white;
      > div {
        padding: 1px 1px 1px 10px;
        // padding: 16px;
      }
    }
  }
  .button {
    padding: 8px;
    margin: 5px;
    font-size: 1em;
    border: 1px solid white;
    box-shadow: 0;
    margin-top: 15px;
  }

  h3 {
    text-transform: uppercase;
    font-size: .8em;
    color: #FFFFFF;
  }

  .mold-text {
    font-size: .8em;
  }

  .process-text {
    font-size: .8em;
  }

  .language-select {
    padding: 5px;
    max-height: 22px;
    font-size: 10px;
    margin-top: 10px;
  }

  .time-stamp {
    margin-top: 8px;
    font-size: .8em;
  }
</style>

<footer>
  <div class="container">
    <div class="user_">
      {#if $user}
        <h3>{$_('Operator')}</h3>
        <p>{$user.name}</p>
      {:else}<a class="button" href="/login">{$_('Log In')}</a>{/if}
    </div>

    <div class="mold">
      <h3>{$_('Mold')}</h3>
      <p class="mold-text">{$mold.name}</p>
    </div>

    <div class="process">
      <h3>{$_('Process')}</h3>
      <p class="process-text">{$process.name}</p>
    </div>

    <div class="info">
      <div class="lang">
        <select
          class="language-select"
          on:click={(e) => console.log(e.target.value) || language.set(e.target.value)}
          value={$language}>
          <option value="en-US">English</option>
          <option value="de-DE">Deutsche</option>
          <option value="fr-FR">Français</option>
        </select>
      </div>

      <div class="time-stamp">
        {new Date().toLocaleDateString($language, dateOptions)}
        {$time}
      </div>
    </div>
  </div>

  <!-- <div class='container'>
    <div class='user'>
      {#if $user}
        <h3>{$_('Operator')}</h3>
        <p>{$user.name}</p>
      {:else}
        <a class='button' href='/login'>{$_('Log In')}</a>
      {/if}
    </div>

    <div class='mold'>
      <h3>{$_('Mold')}</h3>
      <p>{$mold.name}</p>
    </div>

    <div class='process'>
      <h3>{$_('Process')}</h3>
      <p>{$process.name}</p>
    </div>

    <div class='info'>
      <div class='lang'>
        <select class="language-select" on:change={e => console.log(e.target.value) || language.set(e.target.value)} value={$language}>
          <option value='en-US'>English</option>
          <option value='de-DE'>Deutsche</option>
          <option value='fr-FR'>Français</option>
        </select>
      </div>

      <div class='time-stamp'>
        {new Date().toLocaleDateString($language, dateOptions)} {$time}
      </div>
    </div>
  </div> -->
</footer>
