<script>
  import _ from 'data/language'
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import ChangeLog from './cards/ChangeLog.svelte'
  import GroupManagement from './cards/GroupManagement.svelte'
  import UserManagement from './cards/UserManagement.svelte'

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: ChangeLog
    },
    {
      id: 2,
      roles: [ 1, 4 ],
      component: GroupManagement
    },
    {
      id: 3,
      roles: [ 1 ],
      component: UserManagement
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user && $user.role))
</script>

<DashboardSection title={$_('Management')}>
  <div class='card-grid'>
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each}
  </div>
</DashboardSection>