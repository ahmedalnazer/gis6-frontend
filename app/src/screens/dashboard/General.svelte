<script>
  import _ from 'data/language'
  import SavedFiles from './cards/SavedFiles.svelte'
  import NetworkSettings from './cards/NetworkSettings.svelte'
  import UserManagement from './cards/UserManagement.svelte'
  import DashboardSection from './DashboardSection.svelte'

  export let userCards

</script>

<DashboardSection title={$_('General')}>
  <div class='card-grid'>
    {#each (userCards || []) as userCard}
      {#if userCard.CardName == "SAVED_FILES"}
        <SavedFiles {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "NETWORK_SETTINGS"}
        <NetworkSettings {userCard} on:deleteCard />
      {/if}
      {#if userCard.CardName == "USER_MANAGEMENT"}
        <UserManagement {userCard} on:deleteCard />
      {/if}
    {/each}
  </div>
</DashboardSection>

<style>
  .card-grid :global(.container) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .card-grid :global(.image) {
    overflow: hidden;
  }
  .card-grid :global(img) {
    object-fit: cover;
  }
</style>

