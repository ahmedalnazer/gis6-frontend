<script>
  import { onMount, onDestroy } from 'svelte'
  import ActiveAnalysis from './ActiveAnalysis'
  import { Modal, CheckBox, Input, Select } from 'components'
  import _ from 'data/language'
  import groups from 'data/groups'
  import zones from 'data/zones'
  import history from 'router/history';
  import faultAnalysis from 'data/analysis/fault'
  import wiringAnalysis from 'data/analysis/wiring'

  export let type, analysis, description
  let selectedGroup = "all";

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis
  }

  $: analysis = analyses[type]

  let startAnalysisConfirmed = null
  let maxStartingTemperature = 0
  let selectedGroupName = ''

  $: groupOptions = [
    { id: "all", name: `${$_("All Zones")} (${$zones.length})` },
  ].concat($groups);
  $: selectedGroupName = ((groupOptions.filter((x) => x.id == selectedGroup) || []).length == 0 ? "": (groupOptions.filter((x) => x.id == selectedGroup) || [])[0].name);
  $: status = ($analysis && $analysis.status) || "inactive";

  $: toTest = $zones.filter(
    (x) =>
      selectedGroup == "all" ||
      (x.groups ? x.groups.includes(selectedGroup) : [])
  );

  const start = () => {
    startAnalysisConfirmed = true;
    // analysis.start(toTest)
  };

  const exit = () => {
    analysis.reset();
    history.push("/");
  };

  onMount(() => {
    if ($faultAnalysis.lastselectedgroup !== '') {
      selectedGroup = $faultAnalysis.lastselectedgroup
    }
  })

  onDestroy(() => {
    $faultAnalysis.lastselectedgroup = selectedGroup
  })
</script>

<div class="analysis">
  <p>{description}</p>
  <div class="inputs">
    <Select
      bind:value={selectedGroup}
      label={$_("Groups")}
      options={groupOptions}
    />
    <Input
      type="number"
      bind:value={maxStartingTemperature}
      label="{$_('Max Starting Temperature')} (&deg;F)"
    />
    {#if status == "inactive"}
      <a class="button active" on:click={start}>{$_("Start Analysis")}</a>
    {:else if status != "complete"}
      <a class="button" on:click={analysis.stop}>{$_("Cancel Test")}</a>
    {:else}
      <a on:click={start}>(restart)</a>
      <a class="button active" on:click={exit}>{$_("Exit Test")}</a>
    {/if}
  </div>

  <!-- {#if status != "inactive"}
    <ActiveAnalysis type="fault" /> -->

  {#if status != 'inactive'}
    <ActiveAnalysis {type} />
  {/if}
</div>

{#if startAnalysisConfirmed}
  <Modal
    title={$_("Do you want to proceed")}
    onClose={() => (startAnalysisConfirmed = null)}
  >
    <div class="modal">
      <div class="modal-text">
        <p>
          All zones are currently ON and the system is running. The zones will
          need to be turned OFF before the fault analysis can begin. Do you want
          to turn off the zones and proceed with the test?
        </p>
        <div class="modal-grid">
          <div class="modal-col-1">Groups</div>
          <div class="modal-col-2">Max Starting Temperature</div>
          <div />
          <div class="modal-col-1">
            {selectedGroupName}
          </div>
          <div class="modal-col-2">{maxStartingTemperature} (&deg;F)</div>
          <div />
        </div>
        <div class="modal-buttons">
          <div class="button" on:click={() => (startAnalysisConfirmed = null)}>
            Cancel
          </div>
          <div
            class="button active"
            on:click={() => {
              startAnalysisConfirmed = null;
              analysis.start(toTest);
            }}
          >
            Yes, start analysis
          </div>
        </div>
      </div>
    </div></Modal
  >
{/if}

<style lang="scss">
  .inputs {
    display: flex;
    align-items: flex-end;
    padding-bottom: 40px;
    border-bottom: 1px solid var(--gray);
    margin-bottom: 40px;
    :global(.select-container) {
      margin-right: 16px;
    }
    .button {
      margin-left: auto;
    }
  }

  .modal {
    text-align: center;
    padding: 10px;
  }

  .modal-text {
    text-align: left;
    line-height: 1.4;
    font-weight: 600;
  }

  .modal-grid {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-column-gap: 10px;
  }

</style>
