<script>
  import { Input, CheckBox, Select, Icon } from 'components'
  import _ from 'data/language'
  import { defaultUser } from 'data/user'
  import { isEmail } from 'data/utils/tools'
 
  export let permissionsLocked = false

  export let valid = true

  export let validating = false

  export let user = { ...defaultUser }

  let errors = {}
  let tempPlaceholder = 1

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

  <h3 class='permissions-heading'>{$_('Security Level / Role')}</h3>
  <div class='input role-input'>
    <Select bind:value={user.role} options={[
      { id: 3, name: $_('Process Engineer') },
      { id: 2, name: $_('Operator') },
      { id: 4, name: $_('Setup') },
      { id: 5, name: $_('Plant Manager') },
      { id: 1, name: $_('Administrator') },
    ]} />
  </div>

  <h3 class='permissions-heading'>{$_('Permissions')}</h3>
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>

    <div class='checks'>
      <!-- user.cardpermissions.can_recall_process -->
      <CheckBox bind:checked={user.can_recall_process} label={$_('Recall Process')} />
      <CheckBox bind:checked={user.can_change_process_setpoints} label={$_('Change Process Setpoints')} />
      <CheckBox bind:checked={user.can_recall_mold} label={$_('Recall Mold')} />
      <CheckBox bind:checked={user.can_change_mold_settings} label={$_('Change Mold Settings')} />
      <CheckBox bind:checked={user.can_edit_order} label={$_('Edit Order')} />
      <CheckBox bind:checked={user.can_edit_names} label={$_('Edit Group Names')} />
      <CheckBox bind:checked={user.can_turn_system_on} label={$_('Turn System On')} />
      <CheckBox bind:checked={user.can_edit_zone_names} label={$_('Edit Zone Names')} />
      <CheckBox bind:checked={user.can_turn_system_off} label={$_('Turn System Off')} />
      <CheckBox bind:checked={user.can_set_stanby} label={$_('Set Standby')} />
      <CheckBox bind:checked={user.can_edit_home_screen_layout} label={$_('Edit Home Screen Layout')} />
      <CheckBox bind:checked={user.can_set_boost} label={$_('Set Boost')} />
    </div>
  </div>

  <!-- <div class='card border permissions' class:locked={permissionsLocked}>
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
  </div> -->

  <h3 class='permissions-heading'>{$_('Units')}</h3>
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='input units-input'>
      <label>{$_('Units')}</label>
      <Select bind:value={tempPlaceholder} options={[
        { id: 1, name: $_('Metric (SI)') },
        { id: 2, name: $_('US Customary Units') },
      ]} />
    </div>

    <div class="perm-units-content">
      <div class="panel-content">
        <div>
          <label>{$_('Temperature')}</label>
        </div>
        <div class='input'>
          <Select bind:value={tempPlaceholder} options={[
            { id: 1, name: $_('Celsius') },
            { id: 2, name: $_('Fahrenheit') },
            { id: 4, name: $_('Kelvin - K') },
          ]} />
        </div>
      </div>

      <div class="panel-content">
        <div>
          <label>{$_('Electric Current')}</label>
        </div>
        <div class='input'>
          <Select bind:value={tempPlaceholder} options={[
            { id: 1, name: $_('Amperage - A') },
            { id: 2, name: $_('Volt - V') },
            { id: 3, name: $_('Ohms - Ω') },
          ]} />
        </div>
      </div>
  
      <div class="panel-content">
        <div>
          <label>{$_('Electrical Resistance')}</label>
        </div>
        <div class='input'>
          <Select bind:value={tempPlaceholder} options={[
            { id: 1, name: $_('Ohms - Ω') },
          ]} />
        </div>
      </div>
  
      <div class="panel-content">
        <div>
          <label>{$_('Pressure')}</label>
        </div>
        <div class='input'>
          <Select bind:value={tempPlaceholder} options={[
            { id: 1, name: $_('Pascal') },
          ]} />
        </div>
      </div>
  
      <div class="panel-content">
        <div>
          <label>{$_('Length')}</label>
        </div>
        <div class='input'>
          <Select bind:value={tempPlaceholder} options={[
            { id: 1, name: $_('Meters - m') },
          ]} />
        </div>
      </div>
    </div>

  </div>

  <CheckBox bind:checked={user._temp_1} label={$_('Home Screen Mold, Process and Order Panel')} />
  <!-- <h3 class='permissions-heading'>{$_('Home Screen Mold, Process and Order Panel')}</h3> -->
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='checks'>
      <CheckBox bind:checked={user.can_edit_process} label={$_('Mold & Process')} />
      <CheckBox bind:checked={user.can_process_temperature} label={$_('Images')} />
      <CheckBox bind:checked={user.can_edit_hardware} label={$_('Order')} />
    </div>
  </div>

  <CheckBox bind:checked={user._temp_2} label={$_('Home Screen General')} />
  <!-- <h3 class='permissions-heading'>{$_('Home Screen General')}</h3> -->
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='checks'>
      <CheckBox bind:checked={user.can_edit_process} label={$_('Network Settings')} />
      <CheckBox bind:checked={user.can_process_temperature} label={$_('Report & Files')} />
      <CheckBox bind:checked={user.can_edit_hardware} label={$_('User Management')} />
      <CheckBox bind:checked={user.can_edit_hardware} label={$_('Hardware Configuration')} />
    </div>
  </div>

  <h3 class='permissions-heading'>{$_('Hotrunner Live Data Cards')}</h3>
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='checks'>
      <div>
        <div class="live-data-image">
          <Icon icon='miniController' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Minicontroller')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image">
          <Icon icon='setpointTable' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Setpoint Table')} />
          </div>
          <div>Full setpoint data in tabular form</div>
        </div>
      </div>

      <div>
        <div class="live-data-image">
          <Icon icon='ezScreen' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('EZ Screen')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image">
          <Icon icon='toolGraph' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Tool Graph')} />
          </div>
          <div>Custom views of part and groups</div>
        </div>
      </div>


      <div>
        <div class="live-data-image">
          <Icon icon='pilotGraph' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Pilot Graph')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image-">
        </div>
        <div class="live-data-content">
          <div>
            &nbsp;
          </div>
          <div> </div>
        </div>
      </div>

      <div>
        <div class="live-data-image">
          <Icon icon='barGraph' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Bar Graph')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image-">
        </div>
        <div class="live-data-content">
          <div>
            &nbsp;
          </div>
          <div> </div>
        </div>
      </div>
      
      <div>
        <div class="live-data-image">
          <Icon icon='lineGraph' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Line Graph')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image-">
        </div>
        <div class="live-data-content">
          <div>
            &nbsp;
          </div>
          <div> </div>
        </div>
      </div>

      <div>
        <div class="live-data-image">
          <Icon icon='dataTable' color='var(--primary)' />
        </div>
        <div class="live-data-content">
          <div>
            <CheckBox bind:checked={user.can_edit_process} label={$_('Data Table')} />
          </div>
          <div>Basic zone data in table format</div>
        </div>
      </div>

      <div>
        <div class="live-data-image-">
        </div>
        <div class="live-data-content">
          <div>
            &nbsp;
          </div>
          <div> </div>
        </div>
      </div>

    </div>
  </div>

  <CheckBox bind:checked={user._temp_3} label={$_('Hotrunner Dashboard Tools & Diagnostics')} />
  <!-- <h3 class='permissions-heading'>{$_('Hotrunner Dashboard Tools & Diagnostics')}</h3> -->
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='checks'>
      <CheckBox bind:checked={user.can_edit_process} label={$_('Wiring Analysis')} />
      <CheckBox bind:checked={user.can_process_temperature} label={$_('Fault Analysis')} />
      <CheckBox bind:checked={user.can_edit_hardware} label={$_('Thermodynamic Analysis')} />
    </div>
  </div>

  <CheckBox bind:checked={user._temp_4} label={$_('Hotrunner Dashboard Process and Hardware Setting')} />
  <!-- <h3 class='permissions-heading'>{$_('Hotrunner Dashboard Process and Hardware Setting')}</h3> -->
  <div class='perm-section card- border- permissions-' class:locked={permissionsLocked}>
    <div class='checks'>
      <CheckBox bind:checked={user.can_edit_process} label={$_('Group Management')} />
      <CheckBox bind:checked={user.can_process_temperature} label={$_('Zone Names')} />
      <CheckBox bind:checked={user.can_edit_hardware} label={$_('Tunning')} />
    </div>
  </div>

</form>

<style lang="scss">
  // .card.border {
  //   padding: 48px;
  //   text-align: left;
  // }

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
    // margin-top: 48px;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 0;
    line-height: 30px;
  }

  .panel-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 16px;
    padding: 5px;
  }

  .perm-units-content {
    // border: 1px solid indianred;
    padding: 30px 150px 10px 150px;
  }

  .role-input, .units-input {
    max-width: 50%;
  }

  .live-data-image {
    border: 1px solid #cfc5c5;
    width: 70px;
    height: 70px;
    float: left;
  }

  .live-data-content {
    padding-left: 10px;
    // background-color: indianred;
  }

  .perm-section {
    border-bottom: 2px solid #979797;
    padding: 16px;
  }
</style>
