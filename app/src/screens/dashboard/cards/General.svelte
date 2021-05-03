<script>
  import _ from 'data/language'
  import Card from './Card.svelte'
  import { Icon } from 'components'
</script>

<Card>
  <div class="dashboard-card">
    <Icon icon="fileFolder" color="#A0B7CE" size="25" />
    <h2 class="title">{$_('Saved Files')}</h2>
  </div>
</Card>

<Card>
  <div class="dashboard-card">
    <Icon icon="network" color="#A0B7CE" />
    <h2 class="title">{$_('Network Settings')}</h2>
  </div>
</Card>

<Card>
  <div class="dashboard-card">
    <Icon icon="userManagement" color="#A0B7CE" />
    <h2 class="title">{$_('User Management')}</h2>
  </div>
</Card>

<style lang="scss">
  
</style>