<script>
  import { createEventDispatcher } from 'svelte'
  export let onClick = false
  export let checked = false
  export let minus = false
  export let label = ''
  export let changed = false
  export let trackChange = false

  const dispatch = createEventDispatcher()

</script>

<div class='input checkbox' class:changed class:trackChange>
  <label on:click={() => {
    onClick 
      ? onClick()
      : checked = !checked
    dispatch('change')
    if(trackChange) changed = true
  }}>
    <div class='check' class:checked class:minus>
      {#if checked}
        <svg viewbox="0 0 100 100">
          <path d="
            M 15,45
            L 35,65
            L 75,25
          " stroke-width='15'/>
        </svg>
      {:else if minus}
        <div class='minus-container'>
          <div class='minus-bar' />
        </div>
      {/if}
    </div>
    <!-- <input type='checkbox' on:change {checked} /> -->
    {#if label}
      <span>{label}</span>
    {/if}
  </label>
</div>

<style lang="scss">
  .input.checkbox {
    display: inline-flex;
    height: 52px;
    border: 1px solid transparent;
    padding: 16px;
    padding-left: 0;
  }
  label {
    display: flex !important;
    align-items: center;
    margin: 0;
  }

  .check {
    border: 2px solid var(--blue);
    border-radius: 2px;
    margin-right: 16px;
    height: 18px;
    width: 18px;
    &.checked, &.minus {
      background: var(--blue);
    }
  }

  svg {

    width: 16px;
    height: 16px;
    path {

      fill: none;
      stroke: white;
    }
  }

  .minus-container {
    height: 100%;
    width: 100%;
    position: relative;
  }

  .minus-bar {
    width: 12px;
    height: 3px;
    position: absolute;
    background: white;
    left: calc(50% - 6px);
    top: calc(50% - 2px);
  }

  .input.trackChange, .input.changed {
    padding-left: 16px;
  }

  .input.changed {
    background-color: rgba(53, 138, 188, 0.2);
    border: 1px solid var(--primary);
  }
</style>
