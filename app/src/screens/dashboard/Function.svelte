<script>
  import user from 'data/user'
  import DashboardSection from './DashboardSection'
  import HotRunner from './cards/HotRunner'
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

<DashboardSection title={$_('Functions')}>
  <div class='card-grid'>
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each}
  </div>
</DashboardSection>
