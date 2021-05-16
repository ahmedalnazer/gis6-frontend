<script>
  import { createEventDispatcher } from 'svelte'
  export let onClick = false
  export let checked = false
  export let disabled = false
  export let minus = false
  export let label = ''
  export let changed = false
  export let trackChange = false
  export let controlled = false

  const dispatch = createEventDispatcher()

</script>

<div class='input checkbox' class:changed class:trackChange>
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label on:click={() => {
    onClick
      ? onClick()
      : !controlled && (checked = minus ? false : !checked)
    dispatch('change')
    dispatch('click')
    if(trackChange) changed = true
  }}>
    <div class='check' class:checked class:minus class:disabled>
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
      <span class:disabled>{label}</span>
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 2px;
    padding-top: 2px;

    &.checked, &.minus {
      background: var(--blue);
    }
  }

  .disabled {
    opacity: .7;
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
    left: -1px;
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
