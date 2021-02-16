<script>
  import { Progress } from "components";
  import faultAnalysis from "data/analysis/fault";
  import wiringAnalysis from "data/analysis/wiring";
  import _ from "data/language";
  import Error from "./Error.svelte";
  import TestResults from "./TestResults.svelte";

  export let type = "fault";

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis,
  };

  $: analysis = analyses[type];
</script>

<div class="analysis">
  {#if $analysis.status == "complete"}
    <TestResults analysis={$analysis} />
  {:else}
    <div class="status">
      <h2>{$_("Test Status")}</h2>
      <div class="status-wrapper">
        <div class="text">
          <p>{$_("All zones off.")}</p>
          <p>{$analysis.status_message}</p>
        </div>
        <div class="progress">
          <p>{$analysis.progress_message}</p>
          <Progress current={$analysis.progress} background="white" />
        </div>
      </div>
    </div>
  {/if}

  <div class="errors">
    {#if $analysis.errors.length}
      <div class="table-header">
        <div class="name">
          <p>{$_("Zone")}</p>
        </div>
        <div class="thumb">
          <p>{$_("Issue")}</p>
        </div>
        <div class='desciption'>&nbsp;</div>
      </div>
      {#each $analysis.errors as error}
        <Error {error} />
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
    grid-template-columns: 150px 100px 1fr;
    position: sticky;
    font-weight: 700;
    border-bottom: 1px solid #333333;
    padding: 10px;
  }
  
</style>
