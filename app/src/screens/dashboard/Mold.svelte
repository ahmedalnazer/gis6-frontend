<script>
  import _ from 'data/language'
  import Mold from './cards/Mold.svelte'
  import Image from './cards/Image.svelte'
  import Order from './cards/Order.svelte'
  import DashboardSection from './DashboardSection.svelte'
  import Sortable from "sortablejs"
  import { tick } from "svelte"
  import { card_order, sortcards as _sortcards, enableHomeEdit } from 'data/user/cardpref'

  export let userCards

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

<DashboardSection title={$_('Mold, Process, Order')} editEnabled={$enableHomeEdit}>
  <div class='card-grid' bind:this={sortList}>
    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "MOLD"}
        <Mold {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "IMAGES"}
        <Image {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "ORDER"}
        <Order {userCard} on:deleteCard />
      {/if}
    {/each}
  </div>
</DashboardSection>

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr 1fr 2fr);
  }
  .card-grid :global(.image) {
    overflow: hidden;
  }
  .card-grid :global(img) {
    object-fit: cover;
  }
</style>

