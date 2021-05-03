<script>
  import _ from 'data/language'
  import Card from './Card.svelte'
  import { Icon } from 'components'
</script>

<Card>
  <div class="dashboard-card">
    <Icon icon="recentActivity" color="#A0B7CE" />
    <h2 class="title">{$_('Recent Activity')}</h2>
  </div>
</Card>

<Card>
  <div class="dashboard-card">
    <Icon icon="inputOutput" color="#A0B7CE" />
    <h2 class="title">{$_('Inputs & Outputs')}</h2>
  </div>
</Card>

<Card>
  <div class="dashboard-card">
    <Icon icon="cycleData" color="#A0B7CE" />
    <h2 class="title">{$_('Cycle Data')}</h2>
  </div>
</Card>

<Card>
  <div class="dashboard-card">
    <Icon icon="hardwareConfig" color="#A0B7CE" />
    <h2 class="title">{$_('Hardware Configuration')}</h2>
  </div>
</Card>

<style lang="scss">
  
</style>