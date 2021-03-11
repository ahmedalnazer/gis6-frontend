<script>
  import { createEventDispatcher } from 'svelte'
  import { Collapsible } from 'components'
  import { slide } from 'svelte/transition'
  import KeyPad from './KeyPad.svelte'

  const dispatch = createEventDispatcher()

  export let errors = []
  export let info = []
  export let value
  export let label = ''
  export let note = ''
  export let type = ''
  export let inputClass = ''
  export let changed = false
  export let trackChange = false
  export let input = null
  export let display = false
  export let keypadcontrols = {}

  let modalOpened = false

  const handleInput = e => value = e.target.value

</script>

<div class='input text {$$restProps.class || ''}' style={modalOpened ? 'z-index: 11;' : ''}>
  {#if label}
    <label>{label}</label>
  {/if}
  {#if display}
    <div class='display'>
      {value}
    </div>
  {:else}
    <input {type} 
      on:change={e => {
        dispatch('change', e)
        if(trackChange) changed = true
      }}
      on:input={handleInput} 
      class:changed
      {value} 
      {...$$restProps} 
      class={inputClass} 
      autocomplete='new-password'
      bind:this={input}
      on:focus={e => {
        dispatch('focus', e)
      if(type == 'number') {
        modalOpened = true
      } 
      }}
    />
  {/if}
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

{#if type == 'number' && modalOpened}
  <KeyPad anchor={input} {keypadcontrols} bind:onModalOpen={modalOpened} bind:value on:keypadClosed={() => modalOpened = false} />
{/if}

<style>
  input {
    border: 1px solid var(--pale)
  }
  .display {
    padding: 16px;
    padding-left: 0;
  }
  .info, .error {
    font-size: 14px;
  }
  .error {
    color: var(--danger);
  }
  .changed {
    background-color: rgba(53, 138, 188, 0.2);
    border: 1px solid var(--primary);
  }
</style>
