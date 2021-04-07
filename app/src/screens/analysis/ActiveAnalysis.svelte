<script>
  import { Progress } from "components"
  import faultAnalysis from "data/analysis/fault"
  import wiringAnalysis from "data/analysis/wiring"
  import _, { getMessage } from "data/language"
  import Error from "./Error.svelte"
  import TestResults from "./TestResults.svelte"

  export let type = "fault"

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis,
  }
  
  $: analysis = analyses[type]

  let textBox
  $: messages = ($analysis.log || []).map(x => $getMessage(x.id, x))

  $: {
    // scroll to the bottom if current scroll is within range of the last couple of messages
    if(textBox && messages.length) {
      const boxPos = textBox.scrollTop + textBox.offsetHeight
      const stl = textBox.childNodes[textBox.childNodes.length - 2]
      if(stl) {
        const stlPos = stl.offsetTop - textBox.offsetTop
        if(stlPos < boxPos) {
          textBox.scrollTop = textBox.scrollHeight
        }
      } else {
        textBox.scrollTop = textBox.scrollHeight
      }
      
    }
  }

</script>

<div class="analysis">
  {#if $analysis.status == "complete"}
    <TestResults analysis={$analysis} />
  {:else}
    <div class="status">
      <h2>{$_("Test Status")}</h2>
      <div class="status-wrapper">
        <div class="text" bind:this={textBox}>
          {#each messages as message}
            <p>{message}</p>
          {/each}
          <!-- <p>{$analysis.status}</p> -->
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
    padding: 20px;
    padding-bottom: 40px;
  }

  .text {
    margin-top: 20px;
    max-height: 140px;
    overflow: auto;
  }

  .text p {
    position: relative;
    margin: 0;
    /* margin-top: 4px; */
    font-size: 20px;
    font-weight: 600;
    line-height: 28px;
  }

  h2 {
    margin: 0;
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
    border-bottom: 1px solid #A2A4A8;
    padding: 0px 40px 10px 40px;
  }
  
</style>
