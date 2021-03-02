<script>
  import Screen from 'layout/Screen.svelte'
  import UserForm from './UserForm.svelte'
  import _ from 'data/language'
  import { createUser } from 'data/user/actions'
  import { goBack } from 'router/history'
  import notify from 'data/notifications'

  let user, valid

  let validating = false

  const register = async () => {
    if(!valid) {
      validating = true
      return
    }
    await createUser(user)
    goBack()
    notify.success('User successfully created')
  }

  const next = async () => {
    // ???
  }

</script>

<Screen title='{$_('Add User')}'>
  <UserForm bind:valid bind:user {validating} />
  <div class='form-submit'>
    <a class='button active' on:click={register}>Save</a>
    <!-- <a class='button' on:click={next}>Next</a> -->
  </div>
</Screen>
