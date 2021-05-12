<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
</script>

<Card link='/' footerIcon={false}>
  <div class="dashboard-card">
    <Icon icon="network" color="#A0B7CE" />
    <h2 class="title">{$_('Network Settings')}</h2>
  </div>
</Card>
