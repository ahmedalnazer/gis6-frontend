<script>
  import _ from 'data/language'
  import wiringAnalysis from 'data/analysis/wiring'
  import AnalysisCard from './AnalysisCard.svelte'
  
</script>

<AnalysisCard link='/analysis/wiring' title={$_('Wiring Analysis')} analysis={wiringAnalysis} />