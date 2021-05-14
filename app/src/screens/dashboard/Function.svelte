<script>
  import user from 'data/user'
  import DashboardSection from './DashboardSection.svelte'
  import HotRunner from './cards/HotRunner.svelte'
  import _ from 'data/language'
  import Sortable from "sortablejs"
  import { tick } from "svelte"
  import { card_order, sortcards as _sortcards, enableHomeEdit } from 'data/user/cardpref'

  export let userCards

  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: HotRunner
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user.role))

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
</script>

<DashboardSection title={$_('Controller Functions')} editEnabled={$enableHomeEdit}>
  <div class='card-grid' bind:this={sortList}>
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

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 16px;
  }
</style>
