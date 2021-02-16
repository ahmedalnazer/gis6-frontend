<script>
  import ActiveAnalysis from './ActiveAnalysis'
  import { Modal, CheckBox, Input, Select } from 'components'
  import _ from 'data/language'
  import groups from 'data/groups'
  import zones from 'data/zones'
  import history from 'router/history'
  import faultAnalysis from 'data/analysis/fault'
  import wiringAnalysis from 'data/analysis/wiring'

  export let type, analysis, description

  $: groupOptions = [
    { id: "all", name: `${$_("All Zones")} (${$zones.length})` },
  ].concat($groups)

  let selectedGroup = "all"

  $: selectedGroupName = groupOptions.find(x => x.id == selectedGroup).name

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis,
  }

  $: analysis = analyses[type]

  let confirmStart = false
  let confirmStop = false

  let maxStartingTemperature = 0

  $: status = $analysis && $analysis.status || "inactive"
  $: running = status != 'inactive'

  $: toTest = $zones.filter(
    (x) =>
      selectedGroup == "all" ||
      (x.groups ? x.groups.includes(selectedGroup) : [])
  )

  const start = () => {
    confirmStart = false
    analysis.start(toTest)
  }

  const stop = () => {
    confirmStop = false
    analysis.cancel()
  }

  const exit = () => {
    analysis.reset()
    history.push("/")
  }
</script>

<div class="analysis">
  <p class='description'>{description}</p>
  <div class="inputs">
    <Select
      bind:value={selectedGroup}
      label={$_("Groups")}
      options={groupOptions}
      display={running}
    />
    <Input
      type="number"
      bind:value={maxStartingTemperature}
      display={running}
      label="{$_('Max Starting Temperature')} (&deg;F)"
    />
    {#if status == "inactive"}
      <a class="button active" on:click={() => confirmStart = true}>{$_("Start Analysis")}</a>
    {:else if status != "complete"}
      <a class="button" on:click={() => confirmStop = true}>{$_("Cancel Test")}</a>
    {:else}
      <a on:click={start}>(restart)</a>
      <a class="button active" on:click={exit}>{$_("Exit Test")}</a>
    {/if}
  </div>

  <!-- {#if status != "inactive"}
    <ActiveAnalysis type="fault" /> -->

  {#if status != "inactive"}
    <ActiveAnalysis {type} />
  {/if}
</div>

{#if confirmStart}
  <Modal
    title={$_("Do you want to proceed")}
    onClose={() => confirmStart = false}
  >
    <div class="modal">
      <div class="modal-text">
        <p>
          All zones are currently ON and the system is running. The zones will
          need to be turned OFF before the fault analysis can begin. Do you want
          to turn off the zones and proceed with the test?
        </p>
        <div class="modal-grid">
          <div class="modal-header">Groups</div>
          <div class="modal-header">Max Starting Temperature</div>
          <div />
          <div class="modal-body">
            {selectedGroupName}
          </div>
          <div class="modal-body">{maxStartingTemperature} (&deg;F)</div>
          <div />
        </div>
        <div class="modal-buttons">
          <div class="button" on:click={() => confirmStart = false}>
            {$_("No, cancel test")}
          </div>
          <div
            class="button active"
            on:click={start}
          >
            {$_("Yes, start analysis")}
          </div>
        </div>
      </div>
    </div></Modal
  >
{/if}

{#if confirmStop}
  <Modal
    title={$_("Cancel Test")}
    onClose={() => confirmStop = false}
  >
    <div class="modal">
      <div class="modal-text">
        <p>Are you sure you want to cancel the test?</p>
        <div class="modal-buttons">
          <div class="button" on:click={() => confirmStop = false}>
            {$_("No, take me back")}
          </div>
          <div
            class="button active"
            on:click={stop}
          >
            {$_("Yes, cancel test")}
          </div>
        </div>
      </div>
    </div>
  </Modal>
{/if}

<style lang="scss">
  .description {
    margin-bottom: 40px;
  }
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
    line-height: 1.6;
    font-weight: 600;
  }

  .modal-grid {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-column-gap: 10px;
    padding-top: 10px;
  }

  .modal-header {
    font-weight: 700;
  }
</style>
