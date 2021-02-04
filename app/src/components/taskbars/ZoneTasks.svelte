<script>
  import _ from "data/language"
  import { activeSetpointEditor } from 'data/setpoint'
  import { Icon } from 'components'
  import On from './commands/On'
  import Off from './commands/Off'
  import Boost from './commands/Boost'
  import Standby from './commands/Standby' 

  let toggle = key => {
    if($activeSetpointEditor == key) {
      activeSetpointEditor.set('')
    } else {
      activeSetpointEditor.set(key)
    }
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

  <div class='button setpoint' on:click={() => toggle('setpoint')}>
    <div class='icon setpoint'>
      <Icon icon='edit' color='#F5F6F9' />
    </div>
    {$_('Setpoint')}
  </div>
</div>

{#if $activeSetpointEditor == 'off'}
  <Off onClose={() => activeSetpointEditor.set('')} />
{/if}
<span />
{#if $activeSetpointEditor == 'on'}
  <On onClose={() => activeSetpointEditor.set('')} />
{/if}
<span />
{#if $activeSetpointEditor == 'standby'}
  <Standby onClose={() => activeSetpointEditor.set('')} />
{/if}
<span />
{#if $activeSetpointEditor == 'boost'}
  <Boost onClose={() => activeSetpointEditor.set('')} />
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