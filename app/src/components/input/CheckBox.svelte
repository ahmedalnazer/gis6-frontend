<script>
  export let checked = false
  export let label
</script>

<div class='input checkbox'>
  <label on:click={() => checked = !checked}>
    <div class='check' class:checked>
      {#if checked}
        <svg viewbox="0 0 100 100">
          <path d="
            M 15,45
            L 35,65
            L 75,25
          " stroke-width='15'/>
        </svg>
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
  }
  label {
    display: flex !important;
    align-items: center;
  }

  .check {
    border: 2px solid var(--blue);
    border-radius: 2px;
    margin-right: 16px;
    height: 18px;
    width: 18px;
    &.checked {
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
</style>
