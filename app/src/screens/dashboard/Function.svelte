<script>
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import HotRunner from './cards/HotRunner.svelte'
  import _ from 'data/language'

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: HotRunner
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user.role))
</script>

<DashboardSection title={$_('Controller Functions')}>
  <div class='card-grid'>
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each}
  </div>
</DashboardSection>

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 16px;
  }
</style>
