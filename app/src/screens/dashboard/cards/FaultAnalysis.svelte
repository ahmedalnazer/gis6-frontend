<script>
  import _ from 'data/language'
  import faultAnalysis from 'data/analysis/fault'
  import AnalysisCard from './AnalysisCard.svelte'
  
</script>

<AnalysisCard link='/analysis/fault' title={$_('Fault Analysis')} analysis={faultAnalysis} />