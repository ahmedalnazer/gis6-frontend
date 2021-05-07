<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { activeActivityLog } from 'data/activitylog.js'
  import { Icon } from 'components'
</script>

<Card>
  <div class="dashboard-card" on:click={() => { $activeActivityLog = "activitylog" }}>
    <Icon icon="userManagement" color="#A0B7CE" />
    <h2 class="title">{$_('Recent Activity')}</h2>
  </div>
</Card>