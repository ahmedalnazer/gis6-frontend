<script>
  import Card from './Card.svelte'
  import mold from 'data/mold'
  import _ from 'data/language'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
</script>

<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  {#if $enableHomeEdit}
    <div class="card-edit-placeholder">
      <h2 class="title">{$_('Mold & Process')}</h2>
      <Icon icon="trash" color="#358DCA" />
    </div>
  {:else}
    <div class='container'>
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
    </div>
  {/if}
</Card>

<style lang="scss">
  .container {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    grid-gap: 20px;
    .labels {
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
</style>
