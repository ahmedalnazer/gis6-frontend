<script>
  import faultAnalysis from 'data/analysis/fault'
  import wiringAnalysis from 'data/analysis/wiring'

  export let type = 'fault'

  let analyses = {
    fault: faultAnalysis,
    wiring: wiringAnalysis
  }

  let analysis = analyses[type]

</script>

<div class='analysis'>
  ANALYSIS
</div>