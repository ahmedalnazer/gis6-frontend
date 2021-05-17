<script>
  import Screen from 'layout/Screen.svelte'
  import UserForm from './UserForm.svelte'
  import _ from 'data/language'
  import { updateUser } from 'data/user/actions'
  import { users, defaultUser } from 'data/user'
  import DashboardPreferences from './DashboardPreferences.svelte'

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
</script>

<Screen title='{$_('User Profile')}'>
  <UserForm bind:valid bind:user {validating} permissionsLocked={false} />
  <DashboardPreferences />

  <div class='form-submit'>
    <a class='button active' on:click={update}>Save</a>
  </div>
</Screen>
