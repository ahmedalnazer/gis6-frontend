<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let userCard
</script>

{#if $enableHomeEdit}
<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  <div class="card-edit-placeholder">
    <h2 class="title">{$_('Cycle Data')}</h2>
    <div on:click={() => {
      userCard.Enabled = false
      dispatch('deleteCard')
    }}>
      <Icon icon="trash" color="#358DCA" />
    </div>
  </div>
</Card>
{:else}
<Card link='/'>
  <div class="dashboard-card">
    <Icon icon="cycleData" color="#A0B7CE" />
    <h2 class="title">{$_('Cycle Data')}</h2>
  </div>
</Card>
{/if}