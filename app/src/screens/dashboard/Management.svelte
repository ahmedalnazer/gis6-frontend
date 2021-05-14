<script>
  import _ from 'data/language'
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import ChangeLog from './cards/ChangeLog.svelte'
  import MaterialDatabaseCard from './cards/MaterialDatabaseCard.svelte'
  import InputOutput from './cards/InputOutput.svelte'
  import HistoricalData from './cards/HistoricalData.svelte'
  import CycleData from './cards/CycleData.svelte'
  import HardwareConfig from './cards/HardwareConfig.svelte'
  import Sortable from "sortablejs"
  import { tick } from "svelte"
  import { card_order, sortcards as _sortcards, enableHomeEdit } from 'data/user/cardpref'
  
  export let userCards

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: ChangeLog
    }
  ]

  $: sortcards = $_sortcards
  let sortList, sortable

  const resetSortable = async () => {
    await tick()
    if(sortable) sortable.destroy()
    sortable = Sortable.create(sortList, {
      handle: ".cardEnabled",
      animation: 150,
      swapThreshold: 0.75
    })
  }

  $: {
    if(sortList && sortcards && $card_order) {
      resetSortable()
    }
  }

  // {
    //   id: 2,
    //   roles: [ 1 ],
    //   component: UserManagement
  // }

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user && $user.role))
</script>

<DashboardSection title={$_('Tools & Diagnostics')} editEnabled={$enableHomeEdit}>
  <div class='card-grid' bind:this={sortList}>
    <!-- {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each} -->

    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "RECENT_ACTIVITY"}
        <ChangeLog {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "INPUTS_OUTPUTS"}
        <InputOutput {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "HISTORICAL_DATA"}
        <HistoricalData {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "MATERIAL_DATABASE"}
        <MaterialDatabaseCard {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "CYCLE_DATA"}
        <CycleData {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "HARDWARE_CONFIG"}
        <HardwareConfig {userCard} on:deleteCard />
      {/if}
    {/each}
  </div>
</DashboardSection>