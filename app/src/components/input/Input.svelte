<script>
  import { Collapsible } from 'components'
  import { slide } from 'svelte/transition'
  export let errors = []
  export let value = ''
  export let label = ''
  export let note = ''
  export let type = ''

  const handleInput = e => {
    value = e.target.value
  }

</script>

<div class='input text'>
  {#if label}
    <label>{label}</label>
  {/if}
  <input {type} on:change on:input={handleInput} {value} {...$$restProps} autocomplete='new-password' />
  {#if note}
    <p class='muted input-note'>{note}</p>
  {/if}
  <Collapsible open={errors && errors.length}>
    {#each errors || [] as e}
      <p transition:slide|local class='error'>{e}</p>
    {/each}
  </Collapsible>
</div>

<style>
  .error {
    color: var(--danger);
  }
</style>
