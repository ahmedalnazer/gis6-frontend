<script>
  import ActiveAnalysis from './ActiveAnalysis'
  import { Modal, CheckBox, Input, Select } from "components"
  import _ from 'data/language'
  import groups from 'data/groups'
  import zones from 'data/zones'
  import history from 'router/history';
  export let analysis, description

  $: groupOptions = [{id: 'all', name: `${$_('All Zones')} (${$zones.length})`}].concat($groups)
  let selectedGroup = 'all'

  $: status = $analysis && $analysis.status || 'inactive'

  $: toTest = $zones.filter(x => selectedGroup == 'all' || ((x.groups) ? x.groups.includes(selectedGroup): []))

  const start = () => {
    analysis.start(toTest)
  }

  const exit = () => {
    analysis.reset()
    history.push('/')
  }
</script>

<div class='analysis'>
  <p>{description}</p>
  <div class='inputs'>
    <Select bind:value={selectedGroup} label={$_('Groups')} options={groupOptions} />
    <Input type='number' label='{$_('Max Starting Temperature')} (&deg;F)' />
    {#if status == 'inactive'}
      <a class='button active' on:click={start}>{$_('Start Analysis')}</a>
    {:else if status != 'complete'}
      <a class='button' on:click={analysis.stop}>{$_('Cancel Test')}</a>
    {:else}
      <a on:click={start}>(restart)</a>
      <a class='button active' on:click={exit}>{$_('Exit Test')}</a>
    {/if}
  </div>
  {#if status != 'inactive'}
    <ActiveAnalysis type='fault' />
  {/if}

  <!-- <pre>{JSON.stringify($analysis, null, 2)}</pre> -->
</div>

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
</style>