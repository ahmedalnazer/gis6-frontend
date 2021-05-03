<script>
  import _ from 'data/language'
  import Mold from './cards/Mold.svelte'
  import Process from './cards/Process.svelte'
  import OrderCard from "./OrderCard.svelte"
  import DashboardSection from './DashboardSection.svelte'

</script>

<DashboardSection title={$_('Mold, Process, Order')}>
  <div class='card-grid'>
    <Mold />
    <Process />
  </div>
</DashboardSection>

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 10px;
  }
</style>

