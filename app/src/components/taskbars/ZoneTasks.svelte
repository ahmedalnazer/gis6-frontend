<script>
  import _ from "data/language"
  import { activeSetpointEditor } from 'data/setpoint'
  import { Icon } from 'components'
  import On from './commands/On'
  import Off from './commands/Off'
  import Boost from './commands/Boost'
  import Standby from './commands/Standby'
  import activeBoost from 'data/zones/boost'
  import activeStandby from 'data/zones/standby'
  import { afterUpdate } from 'svelte'

  export let onOpenSetPointEditor

  afterUpdate(() => {
    if (onOpenSetPointEditor) {
      toggle('setpoint')
      onOpenSetPointEditor = false
    }
  });

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
  <div 
    class='button' 
    class:pressed={$activeStandby} 
    on:click={() => $activeStandby ? activeStandby.cancel() : toggle('standby')}
  >
    <div class='icon standby'>
      {#if $activeStandby}
        <div class='animated standby'>
          <Icon icon='standby' color='var(--danger)' />
          <Icon icon='standby' color='var(--danger)' />
          <div class='gradient-overlay' />
        </div>
      {:else}
        <Icon icon='standby' color='#F5F6F9' />
      {/if}
    </div>
    {$_('Standby')}
  </div>
  <div 
    class='button' 
    class:pressed={$activeBoost} 
    on:click={() => $activeBoost ? activeBoost.cancel() : toggle('boost')}
  >
    <div class='icon boost'>
      {#if $activeBoost}
        <div class='animated boost'>
          <Icon icon='boost' color='var(--warning)' />
          <Icon icon='boost' color='var(--warning)' />
          <div class='gradient-overlay' />
        </div>
      {:else}
        <Icon icon='boost' color='#F5F6F9' />
      {/if}
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

  @keyframes boostAnimation {
    0% {bottom: -100%}
    100% {bottom: 0%}
  }

  .animated {
    display:flex;
    flex-direction: column;
    margin: -7px;
    position: relative;
    overflow: hidden;
    :global(svg) {
      width: 20px;
      height: 20px;
    }
    .gradient-overlay  {
      --dark: #202e3f;
      animation: boostAnimation 1s infinite linear;
      background: linear-gradient(var(--dark), transparent, transparent, var(--dark)) repeat;
      background-size: 100% 50%;
      background-repeat: repeat;
      background-position: 0, 0;
      position:absolute;
      height: 200%;
      width: 100%;
      left: 0;
      bottom: 0%
    }
  }
</style>