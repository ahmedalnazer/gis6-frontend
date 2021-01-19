<script>
  import user, { roles } from 'data/user'
  import language from 'data/language/current'
  import _, { languages } from 'data/language'
  import { Collapsible } from 'components'
  import mold from 'data/mold'
  import process from 'data/process'
  import time from 'data/time'
  import Icon from 'components/Icon.svelte'

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

        <!-- <select on:change={e => console.log(e.target.value) || language.set(e.target.value)} value={$language}>
          <option value='en-US'>English</option>
          <option value='de-DE'>Deutsche</option>
          <option value='fr-FR'>Français</option>
        </select> -->
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
      padding: 24px 16px;
      text-align: center;
      min-width: 180px;
    }
  }

  .lang {
    margin-bottom: 8px;
    .selector {
      position: absolute;
      right: 0;
      margin-bottom: -1px;
      bottom: 100%;
    }
  }

  .time-stamp {
    text-align: right;
    padding-right: 32px;
  }
</style>
