<script>
  import api from 'data/api'
  import user, { users } from 'data/user'
  import _ from 'data/language'
  import { Modal } from 'components'
  import { loggingIn } from 'data/user/actions'

  let userId

  const login = async e => {
    e.preventDefault()
    if(await api.login(userId, password)) {
      loggingIn.set(false)
    }
  }

  let password = ''

</script>

<Modal onClose={() => loggingIn.set(false)}>
  <div class='image'>
    <img src='/images/barnes_logo_b.png' />
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
  </form>
</Modal>

<style>
  .image {
    text-align: center;
    font-size: 3em;
    margin: 32px 0;
    margin-top: 64px;
  }
  .image img {
    max-height: 120px;
  }
  form {
    width: 300px;
    text-align: left;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding-bottom: 120px;
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
