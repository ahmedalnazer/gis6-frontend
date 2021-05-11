<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
</script>

<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  {#if $enableHomeEdit}
    <div class="card-edit-placeholder">
      <h2 class="title">{$_('Hardware Configuration')}</h2>
      <Icon icon="trash" color="#358DCA" />
    </div>
  {:else}
    <div class="dashboard-card">
      <Icon icon="hardwareConfig" color="#A0B7CE" />
      <h2 class="title">{$_('Hardware Configuration')}</h2>
    </div>
  {/if}
</Card>