<script>
  import { CheckBox, Input, Collapsible } from 'components'
  import _ from 'data/language'

  export let color
  
  export let scale = {
    min: 'auto',
    max: 'auto'
  }

  export let label = ''

  let userDefined = false

  const auto = () => {
    userDefined = false
    scale = { min: 'auto', max: 'auto' }
  }

  const min0 = () => {
    userDefined = false
    scale = { min: 0, max: 'auto' }
  }

  const userDef = () => {
    if(!userDefined) {
      userDefined = true
      scale = { min: 0, max: 500 }
    }
  }

  $: isAuto = scale.max == 'auto' && scale.min == 'auto'
  $: isMin0 = scale.max == 'auto' && scale.min == 0

</script>

<div class='range'>
  <div class='heading'>
    <div class='color' style='background: {color}' />
    <h2>{label}</h2>
  </div>
  
  <div class='options'>
    <CheckBox controlled label={$_('Automatic')} checked={isAuto} on:click={auto} />
    <CheckBox controlled label={$_('Max - Auto, Min - 0')} checked={isMin0} on:click={min0} />
    <CheckBox controlled label={$_('User Defined')} checked={userDefined} on:click={userDef}/>

    <Collapsible open={userDefined}>
      <div class='numbers'>
        <Input type='number' bind:value={scale.max} label={$_('Scale Maximum')} />
        <Input type='number' bind:value={scale.min} label={$_('Scale Minimum')} />
      </div>
    </Collapsible>
  </div>
</div>

<style>
  .heading {
    display: flex;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--gray);
  }
  h2 {
    padding: 0;
    margin: 0;
    margin-left: 20px;
  }
  .color {
    width: 20px;
    height: 20px;
  }

  .options {
    display: grid;
    gap: 8px;
    margin-top: 16px;
  }

  .numbers {
    margin-top: 20px;
    display: grid;
    gap: 32px;
  }

</style>