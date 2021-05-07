<script>
  import _ from 'data/language'
  import Mold from './cards/Mold.svelte'
  import Image from './cards/Image.svelte'
  import Order from './cards/Order.svelte'
  import DashboardSection from './DashboardSection.svelte'

  export let userCards

</script>

<DashboardSection title={$_('Mold, Process, Order')}>
  <div class='card-grid'>
    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "MOLD"}
        <Mold />
      {/if}
      {#if userCard.CardName == "IMAGES"}
        <Image />
      {/if}
      {#if userCard.CardName == "ORDER"}
        <Order />
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

