<script>
  import { onMount, onDestroy } from "svelte";
  import groups from "data/groups";
  import _ from "data/language";
  import zones, { selectedZones } from "data/zones";

  export let onSubmit;
  export let onDone;

  let zoneList = [];
  let emptyBody;

  const applySelected = () => {
    onSubmit($selectedZones);
  };

  const applyGroup = (group) => {
    onSubmit($zones.filter((x) => x.groups && x.groups.includes(group.id)));
  };

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
    <slot>
      <div bind:this={emptyBody} />
    </slot>
  </div>

  <div class="groups">
    <h2>Apply</h2>
    <div class="buttons">
      <div class="button ignore-task-styles" on:click={applySelected}>
        {$_("Selected Zones")}
      </div>
      {#each $groups as group (group.id)}
        <div
          class="button ignore-task-styles"
          on:click={() => applyGroup(group)}
        >
          {group.name}
        </div>
      {/each}
    </div>
  </div>

  <div class="done">
    <button class="button ignore-task-styles active" on:click={(e) => onDone()}>
      {$_("Done")}
    </button>
  </div>
</div>

{#if emptyBody}<style>
    .body {
      display: none;
    }
  </style>{/if}

<style>
  .zone-select-wrapper :global(h2) {
    margin-top: 0;
    padding-top: 0;
    font-size: 22px;
    margin-bottom: 32px;
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
  .done {
    text-align: center;
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 24px;
    grid-row-gap: 32px;
    margin-bottom: 32px;
  }
  .button {
    padding: 12px;
  }
  .zone-selector {
    width: 40%;
  }
</style>
