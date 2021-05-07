<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
</script>

<Card link='/manage-users'>
  <div class="dashboard-card">
    <Icon icon="userManagement" color="#A0B7CE" />
    <h2 class="title">{$_('User Management')}</h2>
  </div>
</Card>
