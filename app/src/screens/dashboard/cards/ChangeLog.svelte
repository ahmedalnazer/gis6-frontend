<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { activeActivityLog } from 'data/activitylog.js'
  import { Icon } from 'components'
  import { enableHomeEdit } from 'data/user/cardpref'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()
  export let userCard
</script>

{#if $enableHomeEdit}
<Card cardEnabled={$enableHomeEdit} smallCard={$enableHomeEdit}>
  <div class="card-edit-placeholder">
    <h2 class="title">{$_('Recent Activity')}</h2>
    <div>
      <Icon icon="move" color="#358DCA" />
      <span on:click={() => {
        userCard.Enabled = false
        dispatch('deleteCard')
      }}>
        <Icon icon="trash" color="#358DCA" />
      </span>
    </div>
  </div>
</Card>
{:else}
<Card link='/'>
  <div class="dashboard-card" on:click={() => activeActivityLog.set(true)}>
    <Icon icon="recentActivity" color="#A0B7CE" />
    <h2 class="title">{$_('Recent Activity')}</h2>
  </div>
</Card>
{/if}
