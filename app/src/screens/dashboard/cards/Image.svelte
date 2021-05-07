<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
</script>

<Card>
  <div class='image'>
    <h2>{$_('Images')}</h2>
    <img src='/images/moldimages/black_pp_left_door.png' />
  </div>
</Card>

<style lang="scss">
  .image {
    overflow: hidden;
    img {
      object-fit: cover;
    }
  }
</style>