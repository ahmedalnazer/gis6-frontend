<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
</script>

<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  {#if $enableHomeEdit}
    <div class="card-edit-placeholder">
      <h2 class="title">{$_('Images')}</h2>
      <Icon icon="trash" color="#358DCA" />
    </div>
  {:else}
    <div class='image'>
      <h2>{$_('Images')}</h2>
      <img src='/images/moldimages/black_pp_left_door.png' />
    </div>
  {/if}
</Card>

<style lang="scss">
  .image {
    overflow: hidden;
    img {
      object-fit: cover;
    }
  }
</style>