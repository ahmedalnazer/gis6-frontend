<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
</script>

<Card link='/' footerIcon={false} cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  {#if $enableHomeEdit}
    <div class="card-edit-placeholder">
      <h2 class="title">{$_('Network Settings')}</h2>
      <Icon icon="trash" color="#358DCA" />
    </div>
  {:else}
    <div class="dashboard-card">
      <Icon icon="network" color="#A0B7CE" />
      <h2 class="title">{$_('Network Settings')}</h2>
    </div>
  {/if}
</Card>
