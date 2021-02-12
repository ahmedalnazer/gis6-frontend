<script>
  import { Progress } from 'components'
  import faultAnalysis from 'data/analysis/fault'
  import wiringAnalysis from 'data/analysis/wiring'
  import _ from 'data/language';
  import Error from './Error.svelte'

  export let type = 'fault'

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis
  }

  $: analysis = analyses[type]

</script>

<div class='analysis'>
  <div class='status'>
    <h2>{$_('Test Status')}</h2>
    <div class='status-wrapper'>
      <div class='text'>
        <p>{$_('All zones off.')}</p>
        <p>{$analysis.status_message}</p>
      </div>
      <div class='progress'>
        <p>{$analysis.progress_message}</p>
        <Progress current={$analysis.progress} background='white'/>
      </div>
    </div>
  </div>

  <div class='errors'>
    {#if $analysis.errors.length}
      <div class='table-header'>
        <p>{$_('Zone')}</p>
        <p>{$_('Issue')}</p>
      </div>
      {#each $analysis.errors as error}
        <Error error={error} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .status {
    background: var(--pale);
    padding: 16px;
  }
  h2 {
    margin-top: 0;
  }
  .status-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .progress p {
   text-align: right;
  }

  .errors {
    overflow: auto;
  }

  .table-header {
    display: grid;
    grid-template-columns: 100px 1fr;
    position: sticky
  }
</style>