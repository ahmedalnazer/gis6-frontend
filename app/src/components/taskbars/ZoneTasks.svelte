<script>
  import _ from "data/language"
  import { showSetpoint, toggleSetpoint } from 'data/setpoint'
  import { Icon } from 'components'
  import On from './commands/On'
  import Off from './commands/Off'
  import Boost from './commands/Boost'
  import Standby from './commands/Standby' 

  let active = ''
  let toggle = key => {
    showSetpoint.set(false)
    active = active == key ? '' : key
  }
</script>


<div class='buttons'>
  <div class='button' on:click={() => toggle('off')}>
    <div class='icon off' />
    {$_('Off')}
  </div>
  <div class='button' on:click={() => toggle('on')}>
    <div class='icon on' />
    {$_('On')}
  </div>
  <div class='button' on:click={() => toggle('standby')}>
    <div class='icon standby'>
      <Icon icon='standby' color='#F5F6F9' />
    </div>
    {$_('Standby')}
  </div>
  <div class='button' on:click={() => toggle('boost')}>
    <div class='icon boost'>
      <Icon icon='boost' color='#F5F6F9' />
    </div>
    {$_('Boost')}
  </div>

  <div class='button setpoint' on:click={toggleSetpoint}>
    <div class='icon setpoint'>
      <Icon icon='edit' color='#F5F6F9' />
    </div>
    {$_('Setpoint')}
  </div>
</div>

{#if active == 'off'}
  <Off onClose={() => active = ''} />
{/if}

{#if active == 'on'}
  <On onClose={() => active = ''} />
{/if}

{#if active == 'standby'}
  <Standby onClose={() => active = ''} />
{/if}

{#if active == 'boost'}
  <Boost onClose={() => active = ''} />
{/if}




<style lang='scss'>
  $white: #F5F6F9;
  .buttons {
    display: flex;
    width: 100%;
  }
  .buttons > .button {
    padding: 16px;
    min-width: 0;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    align-items: center;

    height: 100px;
    width: 120px;
    border-radius: 4px;
    margin-right: 16px;
    &.setpoint {
      margin-left: auto;
      margin-right: 0;
    }
  }
  .icon {
    &.off, &.on {
      background: $white;
      border-color: $white;
      width: 24px;
      height: 24px;
    }
    margin-bottom: 16px;
    margin-top: 8px;
  }
  .off {
    border-radius: 50%;
  }
  .icon.on {
    width: 12px;
  }

</style>