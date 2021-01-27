<script>
  import _ from 'data/language'
  import Mold from './cards/Mold.svelte'
  import Process from './cards/Process.svelte'
  import DashboardSection from './DashboardSection.svelte'

</script>

<DashboardSection title={$_('Mold')}>
  <div class='card-grid'>
    <Mold />
    <Process />
  </div>
</DashboardSection>

<style>
  .card-grid :global(.container) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .card-grid :global(.image) {
    overflow: hidden;
  }
  .card-grid :global(img) {
    object-fit: cover;
  }
</style>

