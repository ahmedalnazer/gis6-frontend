<script>
  import _ from 'data/language'
  import General from './cards/General.svelte'
  import DashboardSection from './DashboardSection.svelte'

</script>

<DashboardSection title={$_('General')}>
  <div class='card-grid'>
    <General />
  </div>
</DashboardSection>

<style>
</style>

