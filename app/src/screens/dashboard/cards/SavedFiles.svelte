<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import { Icon } from 'components'
</script>

<Card link='/' footerIcon={false}>
  <div class="dashboard-card">
    <Icon icon="fileFolder" color="#A0B7CE" size="25" />
    <h2 class="title">{$_('Saved Files')}</h2>
  </div>
</Card>
