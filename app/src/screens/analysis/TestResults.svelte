<script>
  import _ from "data/language"
  export let analysis

  let duration = analysis.endTime.getTime() - analysis.startTime.getTime()

</script>

<div class='test-results'>
  <h3>Test Results</h3>
  <div class='columns'>
    <div class='data green'>
      <h2>{analysis.zones.length}</h2>
      <p>{$_('Zones Tested')}</p>
    </div>
    <div class='data red'>
      <h2>{analysis.errors.length}</h2>
      <p>{$_('Faults')}</p>
    </div>
    <div class='data yellow'>
      <h2>{analysis.zones.filter(x => x.Islocked).length}</h2>
      <p>{$_('Locked Zones')}</p>
    </div>
    <div class='data green'>
      <h2>{Math.ceil(duration / 1000 / 60)} <span class='min'>min</span></h2>
      <p>{$_('Test Duration')}</p>
    </div>
  </div>
</div>

<style>
  .test-results {
    margin-bottom: 20px;
    padding-bottom: 40px;
    border-bottom: 2px solid var(--gray);
  }
  h3 {
    font-size: 22px;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .data {
    border-left: 6px solid var(--green);
    padding: 8px 16px;
  }
  .yellow {
    border-color: var(--warning);
  }
  .red {
    border-color: var(--danger);
  }
  h2 {
    font-size: 40px;
    font-weight: 400;
    padding: 0;
    margin: 0;
    margin-bottom: 16px;
  }
  p {
    text-transform: uppercase;
    margin: 0;
    padding: 0;
    font-weight: 700;
  }
  .min {
    font-size: 20px;
    margin-left: -8px;
  }
</style>
