<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { Icon } from 'components'
</script>

<Card>
  <div class="dashboard-card">
    <Icon icon="hardwareConfig" color="#A0B7CE" />
    <h2 class="title">{$_('Hardware Configuration')}</h2>
  </div>
</Card>