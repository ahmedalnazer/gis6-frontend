<script>
  import user from 'data/user'
  import language from 'data/language/current'
  import _ from 'data/language'
  import { Collapsible } from 'components'
  import mold from 'data/mold'
  import process from 'data/process'
  import time from 'data/time'

  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }

  // for testing
  const dummyUser = { name: 'MJacobi' }
</script>

<footer>
  <div class='container'>
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
        <select on:change={e => console.log(e.target.value) || language.set(e.target.value)} value={$language}>
          <option value='en-US'>English</option>
          <option value='de-DE'>Deutsche</option>
          <option value='fr-FR'>Français</option>
        </select>
      </div>

      <div class='time-stamp'>
        {new Date().toLocaleDateString($language, dateOptions)} {$time}
      </div>
    </div>
  </div>
</footer>

<style lang="scss">
  footer {
    padding: 32px;
    background: var(--blue);
    .container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);

      color: white;
      > div {
        padding: 16px;
      }
    }
  }
  .button {
    border: 3px solid white;
    box-shadow: 0;
    margin-top: 16px;
  }

  h3 {
    text-transform: uppercase;
  }
</style>
