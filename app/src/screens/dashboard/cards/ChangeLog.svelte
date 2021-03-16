<script>
  import _ from "data/language"
  import Card from './Card.svelte'
  import { activeActivityLog } from 'data/activitylog.js'
</script>

<Card>
  <div class="change-log-card" on:click={() => { $activeActivityLog = "activitylog" }}>
    <h2>{$_('Recent Activity Log')}</h2>
    <p class='muted'>Modified 3/16/2021 10:45 PM</p>
  </div>  
</Card>

<style lang="scss">
  .change-log-card {
    height: 100%;
    cursor: pointer;
  }
</style>