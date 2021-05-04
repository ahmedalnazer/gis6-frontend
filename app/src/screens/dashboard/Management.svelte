<script>
  import _ from 'data/language'
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import ChangeLog from './cards/ChangeLog.svelte'
  import MaterialDatabaseCard from './cards/MaterialDatabaseCard.svelte'
  import InputOutput from './cards/InputOutput.svelte'
  import HistoricalData from './cards/HistoricalData.svelte'
  
  export let userCards

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: ChangeLog
    }
  ]

  // {
    //   id: 2,
    //   roles: [ 1 ],
    //   component: UserManagement
  // }

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user && $user.role))
</script>

<DashboardSection title={$_('Tools & Diagnostics')}>
  <div class='card-grid'>
    <!-- {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each} -->

    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "RECENT_ACTIVITY"}
        <ChangeLog />
      {/if}
      {#if userCard.CardName == "INPUTS_OUTPUTS"}
        <InputOutput />
      {/if}
      {#if userCard.CardName == "HISTORICAL_DATA"}
        <HistoricalData />
      {/if}
      {#if userCard.CardName == "MATERIAL_DATABASE"}
        <MaterialDatabaseCard />
      {/if}
    {/each}
  </div>
</DashboardSection>