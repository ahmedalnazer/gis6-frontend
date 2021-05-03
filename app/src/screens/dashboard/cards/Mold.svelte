<script>
  import Card from './Card.svelte'
  import mold from 'data/mold'
  import _ from 'data/language'
</script>

<div class="container">
  <Card>
    <div class='labels'>
      <h2>{$_('Mold & Process')}</h2>
      <p>{$_('Modified 10/08/2020 12:45PM')}</p>
    </div>
    <div class='labels'>
      <h2>{$_('Mold')}</h2>
      <p class='muted'>{$_('Large cap')}</p>
      <!-- <p class='muted'>{$mold.name}</p> -->
    </div>
    <div class='labels'>
      <h2>{$_('Process')}</h2>
      <p class='muted'>{$_('Black ABS')}</p>
    </div>
    <div class='labels'>
      <h2>{$_('Material')}</h2>
      <p class='muted'>{$_('ABS')}</p>
    </div>
    
  </Card>
  <Card>
    <div class='image'>
      <h2>{$_('Images')}</h2>
      <img src='/images/moldimages/black_pp_left_door.png' />
    </div>
  </Card>
</div>

<style lang="scss">
  .container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 10px;
    .labels {
      margin-bottom: 20px;
      h2 {
        font-weight: 600;
        letter-spacing: 0;
        line-height: 27px;
      }
      p {
        letter-spacing: 0;
        line-height: 19px;
        color: var(--textSecondary);
        .muted {
          font-weight: 600;
        }
      }
    }
  }
  .image {
      overflow: hidden;
      img {
        object-fit: cover;
      }
    }
</style>