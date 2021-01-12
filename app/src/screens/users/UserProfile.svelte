<script>
  import Screen from 'layout/Screen'
  import UserForm from './UserForm'
  import _ from 'data/language'
  import { updateUser } from 'data/user/actions'
  import { users, defaultUser } from 'data/user'

  export let userId

  let valid, user
  let loaded = false

  $: {
    if(!loaded) {
      const target = userId && $users.find(x => x.id == userId)
      if(target) {
        user = { ...defaultUser, ...target }
        loaded = true
      }
    }
  }

  let validating = false

  const update = async () => {
    if(!valid) {
      validating = true
      return
    }
    await updateUser(user)
  }

  const next = async () => {
    // ???
  }

  $: console.log(user)

</script>

<Screen title='{$_('User Profile')}'>
  <UserForm bind:valid bind:user {validating} />
  <div class='form-submit'>
    <a class='button active' on:click={update}>Save</a>
  </div>
</Screen>
