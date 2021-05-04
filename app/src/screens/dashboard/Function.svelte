<script>
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import HotRunner from './cards/HotRunner.svelte'
  import _ from 'data/language'

  export let userCards

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
    <!-- {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each} -->

    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "HOT_RUNNER"}
        <HotRunner />
      {/if}
    {/each}
    
  </div>
</DashboardSection>
