<script>
  import user, { roles } from 'data/user'
  import language from 'data/language/current'
  import _, { languages } from 'data/language'
  import { Collapsible } from 'components'
  import mold from 'data/mold'
  import process from 'data/process'
  import time from 'data/time'
  import Icon from 'components/Icon.svelte'
  import { logIn } from 'data/user/actions'
  import api from 'data/api'

  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }

  let selector
  let selectingLanguage = false
  
  const selectLanguage = l => {
    language.set(l)
    selector.blur()
  }

  const toggleLanguage = () => {
    if(selectingLanguage) {
      selector.blur()
    } else {
      selectingLanguage = true
    }
  }


  let loginSelector
  let selectingLogin = false

  const toggleLogin = () => {
    if($user) {
      if(selectingLogin) {
        loginSelector.blur()
      } else {
        selectingLogin = true
      }
    }
  }

  // $: console.log($user)
</script>

<footer>
  <div class='container'>
    <div class='user' 
      tabindex='-1' 
      on:blur={() => selectingLogin = false}
      bind:this={loginSelector}
    >
      <div class='selector'>
        <Collapsible open={selectingLogin}>
            {#if $user}
              <div class='selection'>
              <div>
                <a href='/user-profile/{$user.id}'>{$_('User Profile')}</a>
              </div>
              <div>
                <a href='/user-settings/{$user.id}'>{$_('Settings')}</a>
              </div>
              <div>
                <a on:click={() => api.logout()}>{$_('Logout')}</a>
              </div>
            </div>
          {/if}
        </Collapsible>
      </div>
      <div class='selected-user' class:open={selectingLogin} on:click={toggleLogin}>
        {#if $user && $user.id}
          <h3>{$_(roles[$user.role])}</h3>
          <div class='user-info'>
            <div class='label'>{$user.username}</div>
            <div class='icon'>
              <Icon color='white' icon={'chevron'} />
            </div>
          </div>
        {:else}
          <span class='button blue link' on:click={e => logIn()}>{$_('Log In')}</span>
        {/if}
      </div>
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
      <div class='lang' 
        tabindex='-1' 
        on:blur={() => selectingLanguage = false}
        bind:this={selector}
      >
        <div class='selector'>
          <Collapsible open={selectingLanguage}>
            <div class='selection'>
              {#each Object.keys(languages) as key}
                <div on:click={() => selectLanguage(key)}>{languages[key]}</div>
              {/each}
            </div>
          </Collapsible>
        </div>
        <div class='selected-language' class:open={selectingLanguage} on:click={toggleLanguage}>
          <div class='label'>{languages[$language]}</div>
          <div class='icon'>
            <Icon color='white' icon={'chevron'} />
          </div>
        </div>
      </div>

      <div class='time-stamp'>
        {new Date().toLocaleDateString($language, dateOptions)} {$time}
      </div>
    </div>
  </div>
</footer>

<style lang="scss">
  footer {
    max-height: 120px;
    padding: 16px;
    background: var(--blue);
    position: relative;
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
  .icon :global(svg) {
    width: 12px;
    transform: rotate(-90deg);
    transition: transform .3s;
    margin-left: 16px;
  }
  .open {
    .icon :global(svg) {
      transform: rotate(90deg);
    }
  }
  .selected-language {
    display: flex;
    justify-content: flex-end;
  }
  h3 {
    text-transform: uppercase;
    margin: 0;
  }

  .selector {
    background: var(--blue);
    z-index: 3;
  }

  .selection {
    > div {
      padding: 32px;
      // text-align: center;
      min-width: 180px;
    }
  }

  .lang .selection {
    text-align: center;
  }

  .lang, .user {
    margin-bottom: 8px;
    .selector {
      position: absolute;
      right: 0;
      margin-bottom: -1px;
      bottom: 100%;
    }
  }

  .user {
    .selector {
      right: auto;
      left: 0;
    }
  }

  .user-info {
    margin-top: 10px;
    display: flex;
  }

  .time-stamp {
    text-align: right;
  }
  p {
    margin: 0;
    padding: 0;
    margin-top: 10px;
  }
  a, a:hover, a:visited {
    color: white;
  }
</style>
