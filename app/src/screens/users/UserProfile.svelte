<script>
  import Screen from 'layout/Screen.svelte'
  import UserForm from './UserForm.svelte'
  import _ from 'data/language'
  import { updateUser, updateUserProfile } from 'data/user/actions'
  import { users, defaultUser, default as _user } from 'data/user'
  import DashboardPreferences from './DashboardPreferences.svelte'
  import notify from 'data/notifications'

  export let userId

  let valid, user
  let loaded = false
  let enabled = {}

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
      notify.error($_('Please check your information and try again'))
      validating = true
      return
    }
    await updateUser(user)
    const user_card_prefs = { ...$_user.user_card_prefs || {}, enabled }
    await updateUserProfile($_user.id, { user_card_prefs })
    notify.success($_('User profile updated'))
  }
</script>

<Screen title='{$_('User Profile')}'>
  <UserForm bind:valid bind:user {validating} permissionsLocked={true} profile />
  <DashboardPreferences bind:enabled />

  <div class='form-submit'>
    <a class='button active' on:click={update}>Save</a>
  </div>
</Screen>
