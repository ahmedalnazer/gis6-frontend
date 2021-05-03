<script>
  import _ from 'data/language'
  import Tools from './cards/Tools.svelte'
  import DashboardSection from './DashboardSection.svelte'

</script>

<DashboardSection title={$_('Tools & Diagnostics')}>
  <div class='card-grid'>
    <Tools />
  </div>
</DashboardSection>

<style>
</style>

