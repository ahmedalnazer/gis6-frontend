<script>
  import { onMount } from 'svelte'
  import ActiveAnalysis from "./ActiveAnalysis"
  import { Modal, Icon, Input, Select } from "components"
  import _ from "data/language"
  import groups, { activeGroup } from "data/groups"
  import zones from "data/zones"
  import history from "router/history"
  import faultAnalysis from "data/analysis/fault"
  import wiringAnalysis from "data/analysis/wiring"
  import notify from "data/notifications"
  import user from "data/user"
  import mold from "data/mold"
  import AnalysisReport from './AnalysisReport'

  export let type, description

  const totalZones = (id) =>
    $zones.filter((x) => (x.groups || []).includes(id)).length

  $: groupOptions = [
    { id: "all", name: `${$_("All Zones")} (${$zones.length} ${$_("zones")})` },
  ].concat(
    $groups.map((g) => ({
      ...g,
      name: `${g.name} (${totalZones(g.id)} ${$_("zones")})`,
    }))
  )

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis,
  }

  $: messages = {
    fault: {
      start: $_("Fault analysis started"),
      cancel: $_("Fault analysis canceled"),
      complete: $_("Fault analysis complete"),
    },
    wiring: {
      start: $_("Wiring analysis started"),
      cancel: $_("Wiring analysis canceled"),
      complete: $_("Wiring analysis complete"),
    },
  }

  $: analysis = analyses[type]

  let selectedGroup = $activeGroup || "all"

  $: selectedGroupName = groupOptions.find((x) => x.id == selectedGroup).name

  let confirmStart = false
  let confirmStop = false

  let maxStartingTemperature = 200

  $: status = $analysis && $analysis.status || "inactive"
  $: running = status != "inactive"

  $: toTest = $zones.filter(x => selectedGroup == "all" || x.groups && x.groups.includes(selectedGroup))

  const start = () => {
    confirmStart = false
    notify.success(messages[type].start)
    analysis.start(
      toTest,
      messages[type].complete,
      selectedGroupName,
      selectedGroup == 'all' ? null : selectedGroup,
      maxStartingTemperature * 10,
      $user && $user.username || $_("Operator"),
      $mold.name || $_("Unknown")
    )
  }

  const stop = () => {
    confirmStop = false
    analysis.cancel()
    notify(messages[type].cancel)
  }

  const exit = () => {
    analysis.reset()
    history.push("/hot-runner")
  }

  $: zonesOn = $zones.filter(x => x.IsZoneOn).length

  $: startMessage = zonesOn 
    ? $_(`All zones are currently ON and the system is running. The zones will
        need to be turned OFF before the fault analysis can begin. Do you want
        to turn off the zones and proceed with the test?`)
    : $_(`All zones are off and the analysis can start.`)

  onMount(() => {
    if($analysis.groupId) selectedGroup = $analysis.groupId
  })

  let openReportModal = false
  const OnOpenReportModal = () => {
    openReportModal = true
  }
</script>

<div class="analysis">
  <p class="description">{description}</p>
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
      <a class="button active" on:click={() => {
        if(!toTest.length) {
          notify('Please select a group containing at least one zone')
        } else {
          confirmStart = true
      }}}
        >{$_("Start Analysis")}</a
      >
    {:else if status != "complete"}
      <a class="button" class:disabled={$analysis.canceling} on:click={() => confirmStop = true}
        >{$_("Cancel Test")}</a
      >
    {:else}
      <!-- <a on:click={start}>(restart)</a> -->
      <div class="complete">
        <div class="report-button" on:click={OnOpenReportModal}>
          <Icon icon="report" color="var(--primary)" />
          {$_("View Report")}
        </div>
        <a class="button active" on:click={exit}>{$_("Exit Test")}</a>
      </div>
    {/if}
  </div>

  <!-- {#if status != "inactive"}
    <ActiveAnalysis type="fault" /> -->

  {#if status != "inactive"}
    <ActiveAnalysis {type} />
  {/if}

  {#if openReportModal}
    <AnalysisReport analysis={analysis} onClose={() => openReportModal = false} />
  {/if}
</div>

{#if confirmStart}
  <Modal
    title={$_("Do you want to proceed?")}
    onClose={() => confirmStart = false}
  >
    <div class="modal-text">
      <p>
        {startMessage}
      </p>
      <div class="modal-grid">
        <Select
          bind:value={selectedGroup}
          label={$_("Groups")}
          options={groupOptions}
          display
        />
        <Input
          type="number"
          bind:value={maxStartingTemperature}
          display
          label="{$_('Max Starting Temperature')} (&deg;F)"
        />
      </div>
      <div class="modal-buttons">
        <div
          class="button cancel-button"
          on:click={() => confirmStart = false}
        >
          {$_("No, cancel test")}
        </div>
        <div class="button confirm-button active" on:click={start}>
          {$_("Yes, start analysis")}
        </div>
      </div>
    </div>
  </Modal>
{/if}

{#if confirmStop}
  <Modal title={$_("Cancel Test")} onClose={() => confirmStop = false}>
    <div class="modal-text">
      <p class="cancel-message">
        {$_("Are you sure you want to cancel the test?")}
      </p>
      <div class="modal-buttons">
        <div class="button" on:click={() => confirmStop = false}>
          {$_("No, take me back")}
        </div>
        <div class="button active" on:click={stop}>
          {$_("Yes, cancel test")}
        </div>
      </div>
    </div>
  </Modal>
{/if}

<style lang="scss">
  .description {
    margin-top: -20px;
    margin-bottom: 40px;
    color: #011f3e;
    font-size: 16px;
    letter-spacing: 0;
    line-height: 22px;
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
    .button,
    .complete {
      margin-left: auto;
    }
  }

  .complete {
    display: flex;
    align-items: center;
    .button {
      margin-left: 20px;
    }
  }

  .report-button {
    display: flex;
    align-items: center;
    color: var(--primary);
    :global(svg) {
      margin-right: 8px;
    }
  }

  .modal-buttons {
    justify-content: space-between;
    .button {
      margin: 0;
    }
  }

  .modal-text p {
    text-align: left;
    line-height: 27px;
    font-weight: 600;
    font-size: 20px;
  }

  .modal-grid {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-column-gap: 10px;
    padding-top: 20px;
  }

  .modal-header {
    font-weight: 700;
  }

  .report-button :global(svg) {
    width: 24px;
  }
  .cancel-message {
    margin-bottom: 100px;
  }
</style>
