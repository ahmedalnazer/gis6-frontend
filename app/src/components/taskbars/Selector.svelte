<script>
  export let onSubmit

  let selected = []
</script>

<div class='zone-select-wrapper'>
  
  <div class='zone-dropdown'>
    <h2>Select</h2>
    Dropdown
  </div>
  
  <div class='body'>
    <slot />
  </div>

  <div class='groups'>
    <h2>Apply</h2>
    Groups
  </div>
  
  <div class='done'>
    <button class='button active' on:click={e => onSubmit(selected)}>Done</button>
  </div>
  
</div>

<style>
  .zone-select-wrapper :global(h2) {
    font-size: 22px;
  }
  .zone-dropdown, .body, .groups {
    padding: 32px 0;
  }
  .zone-dropdown, .body {
    border-bottom: 1px solid var(--grayBorder);
  }
  .zone-dropdown {
    padding-top: 0;
    margin-top: 0;
  }
  .done {
    text-align: center;
  }
</style>