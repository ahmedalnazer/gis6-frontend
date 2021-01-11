<script>
  import Screen from 'layout/screen'
  import api from 'data/api'
  import user, { users } from 'data/user'
  import _ from 'data/language'
  import { goBack } from 'router/history'

  let userId

  const login = async e => {
    e.preventDefault()
    await api.login(userId, password)
    // TODO: api login
    user.set($users.find(x => x.id == userId))
  }

  let password = ''

</script>

<Screen class='login-form'>
  <div class='image'>
    BARNES
  </div>
  <form on:submit={login}>

    <label>{$_('Username')}</label>
    <select bind:value={userId}>
      <option value=''>{$_('Select...')}</option>
      {#each $users as user (user.id)}
        <option>{user.username}</option>
      {/each}
    </select>

    <label>{$_('Password')}</label>
    <input bind:value={password} type='password' />

    <a href='/forgot-password'>{$_('Forgot Password?')}</a>

    <button class='button active'>{$_('Log In')}</button>

    <i class='close' on:click={() => history.back()}>X</i>
  </form>
</Screen>

<style>
  :global(.login-form main) {
    position: relative;
  }
  .image {
    text-align: center;
    font-size: 3em;
    margin: 32px 0;
    margin-top: 64px;
  }
  form {
    width: 300px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  label {
    margin-top: 48px;
    margin-bottom: 8px;
  }

  a {
    margin-top: 16px;
  }

  button {
    margin-top: 48px;
  }

  .close {
    position: absolute;
    font-size: 2em;
    top: 32px;
    right: 32px;
  }
</style>
