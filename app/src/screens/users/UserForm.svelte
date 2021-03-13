<script>
  import { Input, CheckBox, Select } from 'components'
  import _ from 'data/language'
  import { defaultUser } from 'data/user'
  import { isEmail } from 'data/utils/tools'

  export let permissionsLocked = false

  export let valid = true

  export let validating = false

  export let user = { ...defaultUser }

  let errors = {}

  const validate = (user) => {
    // check user properties
    let err = {
      first_name: [],
      last_name: [],
      username: []
    }
    if(user.first_name.length > 50) {
      err.first_name = [ $_('First name must be less than 50 characters') ]
    }
    if(!user.first_name) {
      err.first_name.push($_('First name is a required field'))
    }
    if(user.last_name.length > 50) {
      err.last_name = [ $_('Last name must be less than 50 characters') ]
    }
    if(!user.last_name) {
      err.last_name.push($_('Last name is a required field'))
    }
    if(user.username.length > 50) {
      err.username.push($_('First name must be less than 50 characters'))
    }
    if(!user.username) {
      err.username.push(`${$_('User Login Id is a required field')}`)
    }
    if(!isEmail(user.email)) {
      err.email = [ $_('Please include a valid email address') ]
    }
    let numbers = 0
    for(let char of user.password) {
      if(parseInt(char) != NaN) {
        numbers += 1
      }
    }
    const specialChar = /(?=.*[!@#$%^&*])/.test(user.password || '')

    if(user.password.length < 8 || numbers < 2 || !specialChar) {
      err.password = [ $_('Please ensure your password is at least 8 characters, including at least 2 numbers and 1 special character') ]
    }

    if(validating) {
      errors = err
    }
    return Object.keys(err).filter(key => err[key] && err[key].length > 0).length === 0
  }

  $: {
    valid = validate(user, validating)
  }

  // $: console.log(validating, errors)

</script>

<form on:submit|preventDefault autocomplete="off">
  <h3>{$_('Personal Info')}</h3>
  <div class='card border personal-inputs'>
    <Input bind:value={user.first_name} label={$_('First Name')} errors={errors.first_name} />
    <Input bind:value={user.last_name} label={$_('Last Name')} errors={errors.last_name} />
    <Input bind:value={user.email} label={$_('Email')} errors={errors.email} />
    <div class='input'>
      <label>{$_('Language')}</label>
      <Select bind:value={user.language} options={[
        { id: 'en-US', name: 'English' },
        { id: 'de-DE', name: 'Deutsche' }
      ]} />
    </div>
    <Input bind:value={user.username} label={$_('User Login ID')} errors={errors.username} />
    <Input
      type='password'
      bind:value={user.password}
      label={$_('Password')}
      errors={errors.password}
      info={
        !errors.password || !errors.password.length
          ? [ $_('Minimum 8 characters, 2 numeric and one special character') ]
          : []
      }
    />
  </div>

  <h3 class='permissions-heading'>{$_('Permissions')}</h3>
  <div class='card border permissions' class:locked={permissionsLocked}>
    <div class='input'>
      <label>{$_('Security Level / Role')}</label>
      <Select bind:value={user.role} options={[
        { id: 3, name: $_('Process Engineer') },
        { id: 2, name: $_('Operator') },
        { id: 4, name: $_('Setup') },
        { id: 5, name: $_('Plant Manager') },
        { id: 1, name: $_('Administrator') },
      ]} />
    </div>
    <h4>{$_('Category')}</h4>
    <div class='checks'>
      <CheckBox bind:checked={user.can_edit_process} label={$_('Edit Process')} />
      <CheckBox bind:checked={user.can_process_temperature} label={$_('Process Temperature Setpoint')} />

      <CheckBox bind:checked={user.can_edit_hardware} label={$_('Edit Hardware')} />
      <CheckBox bind:checked={user.can_set_automatic_manual_mode} label={$_('Automatic - Manual Mode')} />

      <CheckBox bind:checked={user.can_edit_order} label={$_('Edit Order')} />
      <CheckBox bind:checked={user.can_turn_zone_off} label={$_('Turn Zone Off')} />

      <CheckBox bind:checked={user.can_edit_calibration} label={$_('Home / Calibration')} />
      <CheckBox bind:checked={user.can_trim_setpoint} label={$_('Trim Setpoint')} />


      <CheckBox bind:checked={user.can_lock_zone_off} label={$_('Lock Zone Off')} />
      <CheckBox bind:checked={user.can_deviation_setpoint} label={$_('Deviation Setpoint')} />

      <CheckBox bind:checked={user.can_turn_zone_on} label={$_('Turn Zone On')} />
      <CheckBox bind:checked={user.can_auto_standby} label={$_('Auto-standby Setpoint')} />

    </div>
  </div>
</form>

<style lang="scss">
  .card.border {
    padding: 48px;
    text-align: left;
  }

  .personal-inputs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 32px;
    :global(.input) {
      :global(input, select) {
        width: 100%;
      }
    }
  }

  .checks {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .permissions-heading {
    margin-top: 48px;
  }
</style>
