<script>
  import api from 'data/api'
  import { users } from 'data/user'
  import _ from 'data/language'
  import { Modal, Select } from 'components'
  import { loggingIn } from 'data/user/actions'

  let username
  let password = ''

  const login = async e => {
    e.preventDefault()
    if(await api.login(username, password)) {
      loggingIn.set(false)
    }
  }
</script>

<Modal onClose={() => loggingIn.set(false)}>
  <div class='image'>
    <img src='/images/barnes_logo_b.png' />
  </div>
  <form on:submit={login}>
    <label>{$_('Username')}</label>
    <Select 
      bind:value={username}
      options={$users}
      placeholder={$_('Select...')}
      id='username'
      getLabel={u => u && u.username}
    />

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
</style>
