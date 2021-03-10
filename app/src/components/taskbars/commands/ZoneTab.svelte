<script>
  import { Icon } from 'components'
  export let mode
  export let label
  export let setMode
  $: active = label == mode
</script>

<div class='button' class:active on:click={() => setMode(label)}>
  <div>
    <Icon icon='check' color='white' />
  </div>
  <slot />
</div>

<style>
  .button {
    display: flex;
    align-items: center;
    box-shadow: none;
    margin-right: -1px;
    font-size: 16px;
    border-width: 1px;
  }
  .button :global(svg) {
    padding-top: 4px;
    width: 16px;
    margin-left: -8px;
    margin-right: 8px;
  } 
  
</style>