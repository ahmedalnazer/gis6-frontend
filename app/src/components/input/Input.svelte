<script>
  import { Collapsible } from 'components'
  import { slide } from 'svelte/transition'
  import KeyPad from './KeyPad'

  export let errors = []
  export let info = []
  export let value
  export let label = ''
  export let note = ''
  export let type = ''
  export let inputClass = ''
  export let changed = false
  export let input = null

  let openKeypadModal
  let modalOpned = false

  const onCloseKeypad = (event) => {
    modalOpned = false
    changed = value && event.detail.closed
  }

  const handleInput = e => {
    value = e.target.value
  }

</script>

<div class='input text {$$restProps.class || ''}' style={modalOpned ? 'z-index: 11;' : ''}>
  {#if label}
    <label>{label}</label>
  {/if}
  <input {type} 
    on:change 
    on:input={handleInput} 
    class:changed
    {value} 
    {...$$restProps} 
    class={inputClass} 
    autocomplete='new-password'
    bind:this={input}
    on:focus={() => {
     if(type == 'number') {
       openKeypadModal()
       modalOpned = true
     } 
    }}
  />
  {#if note}
    <p class='muted input-note'>{note}</p>
  {/if}
  <Collapsible open={errors && errors.length}>
    {#each errors || [] as e}
      <p transition:slide|local class='error'>{e}</p>
    {/each}
  </Collapsible>
  <Collapsible open={info && info.length}>
    {#each info || [] as i}
      <p transition:slide|local class='info muted'>{i}</p>
    {/each}
  </Collapsible>
</div>

{#if type == 'number'}
  <KeyPad anchor={input} bind:openKeypadModal bind:value on:keypadClosed={onCloseKeypad} />
{/if}

<style>
  input {
    border: 1px solid var(--pale)
  }
  .info, .error {
    font-size: 14px;
  }
  .error {
    color: var(--danger);
  }
  .changed {
    background-color: rgba(53, 138, 188, 0.5);
    border: 1px solid #358cca;
  }
</style>
