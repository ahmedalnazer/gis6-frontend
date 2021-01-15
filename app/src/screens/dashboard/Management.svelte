<script>
  import _ from 'data/language'
  import user from 'data/user'
  import DashboardSection from './DashboardSection'
  import ChangeLog from './cards/ChangeLog'
  import GroupManagement from './cards/GroupManagement'

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: ChangeLog
    },
    {
      id: 2,
      roles: [ 'all' ],
      component: GroupManagement
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user.role))
</script>

<DashboardSection title={$_('Management')}>
  <div class='cards'>
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each}
  </div>
</DashboardSection>


<style>
  .cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 16px;
  }
</style>