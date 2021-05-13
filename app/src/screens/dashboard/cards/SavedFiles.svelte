<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let userCard
</script>

{#if $enableHomeEdit}
<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  <div class="card-edit-placeholder">
    <h2 class="title">{$_('Saved Files')}</h2>
    <div on:click={() => {
      userCard.Enabled = false
      dispatch('deleteCard')
    }}>
      <Icon icon="trash" color="#358DCA" />
    </div>
  </div>
</Card>
{:else}
<Card link='/' footerIcon={false}>
  <div class="dashboard-card">
    <Icon icon="fileFolder" color="#A0B7CE" />
    <h2 class="title">{$_('Saved Files')}</h2>
  </div>
</Card>
{/if}

