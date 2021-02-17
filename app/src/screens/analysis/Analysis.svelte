<script>
  import ActiveAnalysis from './ActiveAnalysis'
  import { Modal, Icon, Input, Select } from 'components'
  import _ from 'data/language'
  import groups, { activeGroup } from 'data/groups'
  import zones from 'data/zones'
  import history from 'router/history'
  import faultAnalysis from 'data/analysis/fault'
  import wiringAnalysis from 'data/analysis/wiring'
  import notify from 'data/notifications'
  import user from 'data/user'
  import mold from 'data/mold'

  export let type, analysis, description

  const totalZones = id => $zones.filter(x => x.groups.includes(id)).length

  $: groupOptions = [
    { id: "all", name: `${$_("All Zones")} (${$zones.length} ${$_('zones')})` },
  ].concat($groups.map(g => ({
    ...g,
    name: `${g.name} (${totalZones(g.id)} ${$_('zones')})`
  })))

  let selectedGroup =  $activeGroup ? $activeGroup.id : "all"

  $: selectedGroupName = groupOptions.find(x => x.id == selectedGroup).name

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis,
  }

  $: messages = {
    fault: {
      start: $_('Fault analysis started'),
      cancel: $_('Fault analysis cancelled'),
      complete: $_('Fault analysis complete')
    },
    wiring: {
      start: $_('Wiring analysis started'),
      cancel: $_('Wiring analysis cancelled'),
      complete: $_('Wiring analysis complete')
    }
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
    notify.success(messages[type].start)
    analysis.start(
      toTest, 
      messages[type].complete, 
      selectedGroupName, 
      maxStartingTemperature,
      $user && $user.username || $_('Operator'),
      $mold.name || $_('Unknown')
    )
  }

  const stop = () => {
    confirmStop = false
    analysis.cancel()
    notify(messages[type].cancel)
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
      <!-- <a on:click={start}>(restart)</a> -->
      <div class='complete'>
        <div class='report-button'>
          <Icon icon='report' color='var(--primary)' /> {$_('View Report')}
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
        <p>{$_('Are you sure you want to cancel the test?')}</p>
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
    .button, .complete {
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

  .report-button :global(svg) {
    width: 24px;
  }
</style>
