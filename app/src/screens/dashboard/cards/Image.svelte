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
<Card cardEnabled={$enableHomeEdit} bigCard={$enableHomeEdit}>
  <div class="card-edit-placeholder">
    <h2 class="title">{$_('Images')}</h2>
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
  <div class='image'>
    <h2>{$_('Images')}</h2>
    <img src='/images/moldimages/black_pp_left_door.png' />
  </div>
</Card>
{/if}

<style lang="scss">
  .image {
    overflow: hidden;
    img {
      object-fit: cover;
    }
  }
</style>