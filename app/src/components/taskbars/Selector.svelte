<script>
  import { onMount, onDestroy } from "svelte";
  import zones from "data/zones";
  export let onSubmit;
  let zoneList = [];
  let selected = [];

  onMount(() => {
    zoneList = $zones;

    // Filter if necessary
    // zoneList = $zones.filter((x) => {
    // let grpContains = groupList.filter((g) => g.name == x);
    //   return !grpContains.length;
    // });
  });

  // onDestroy(() => { })
</script>

<div class="zone-select-wrapper">
  <div class="zone-dropdown">
    <h2>Select</h2>
    <div>
      <select class="zone-selector">
        <option value="">--Select One--</option>
        {#each zoneList || [] as zoneListShow}
          <option value={zoneListShow.name}>{zoneListShow.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="body">
    <slot />
  </div>

  <div class="groups">
    <h2>Apply</h2>
    Groups
  </div>

  <div class="done">
    <button class="button active" on:click={(e) => onSubmit(selected)}
      >Done</button
    >
  </div>
</div>

<style>
  .zone-select-wrapper :global(h2) {
    font-size: 22px;
  }
  .zone-dropdown,
  .body,
  .groups {
    padding: 32px 0;
  }
  .zone-dropdown,
  .body {
    border-bottom: 1px solid var(--grayBorder);
  }
  .zone-dropdown {
    padding-top: 0;
    margin-top: 0;
  }
  .zone-selector {
    width: 40%;
  }

  .done {
    text-align: center;
  }
</style>
