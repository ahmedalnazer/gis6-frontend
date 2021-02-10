<script>
  import ActiveAnalysis from './ActiveAnalysis'
  import { Modal, CheckBox, Input, Select } from "components"
  import _ from 'data/language'
  import groups from 'data/groups'
  import zones from 'data/zones'
  export let analysis, description

  $: groupOptions = [{id: 'all', name: `${$_('All Zones')} (${$zones.length})`}].concat($groups)

  $: status = $analysis && $analysis.status || 'inactive'
</script>

<div class='analysis'>
  <p>{description}</p>
  <div class='inputs'>
    <Select label={$_('Groups')} options={groupOptions} />
    <Input type='number' label='{$_('Max Starting Temperature')} (&deg;F)' />
    {#if status == 'inactive'}
      <a class='button active' on:click={analysis.start}>{$_('Start Analysis')}</a>
    {:else if status == 'active'}
      <a class='button' on:click={analysis.stop}>{$_('Cancel Analysis')}</a>
    {:else}
      <a class='button active' href='/'>{$_('Exit Analysis')}</a>
    {/if}
  </div>
  {#if status != 'inactive'}
    <ActiveAnalysis type='fault' />
  {/if}
</div>

<style lang="scss">
  .inputs {
    display: flex;
    align-items: flex-end;
    :global(.select-container) {
      margin-right: 16px;
    }
    .button {
      margin-left: auto;
    }
  }
</style>