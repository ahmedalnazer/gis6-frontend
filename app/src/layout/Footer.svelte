<script>
  import user, { roles } from 'data/user'
  import language from 'data/language/current'
  import _ from 'data/language'
  import { Collapsible } from 'components'
  import mold from 'data/mold'
  import process from 'data/process'
  import time from 'data/time'

  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }
</script>

<footer>
  <div class='container'>
    <div class='user'>
      {#if $user && $user.id}
        <h3>{$_(roles[$user.role])}</h3>
        <p>{$user.username}</p>
      {:else}
        <a class='button blue' href='/login'>{$_('Log In')}</a>
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
    padding: 32px 16px;
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
  }

  h3 {
    text-transform: uppercase;
    margin: 0;
  }
</style>
