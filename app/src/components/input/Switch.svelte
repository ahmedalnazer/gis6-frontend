<script>
  import _ from "data/language";
  import Switch from "svelte-switch"
  export let checked = false
  export let onLabel = $_('On')
  export let offLabel = $_('Off')
  export let changed = false
</script>

<div class='switch-container'>
  <div class='inner' class:changed>
    <div class='label off'>
      {offLabel}
    </div>
    <Switch on:change bind:checked onColor="#358cca" />
    <div class='label on'>
      {onLabel}
    </div>
  </div>
</div>

<style>
  .switch-container {
    display: flex;
  }
  .inner {
    display: flex;
    align-items: center;
    padding: 8px 0;
  }
  .label {
    margin: 8px;
  }
  .changed {
    background-color: rgba(53, 138, 188, 0.2);
    border: 1px solid var(--primary);
  }
</style>