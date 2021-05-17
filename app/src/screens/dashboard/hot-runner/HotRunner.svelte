<script>
  import Screen from 'layout/Screen.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import FaultAnalysis from '../cards/FaultAnalysis.svelte'
  import WiringAnalysis from '../cards/WiringAnalysis.svelte'
  import ZoneNames from '../cards/ZoneNames.svelte'
  import user, { roles } from 'data/user'
  import _ from 'data/language'
  import MaterialDatabaseCard from '../cards/MaterialDatabaseCard.svelte'
  import GroupManagement from '../cards/GroupManagement.svelte'
  import DataVis from '../cards/datavis/Wrapper.svelte'
  import Summary from './Summary.svelte'
  import CardSet from '../CardSet'
  import EditBar from '../EditBar.svelte'

  // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
  let cards = [
    {
      id: 4,
      roles: [ 1, 3 ],
      component: GroupManagement
    },
    {
      id: 3,
      roles: [ 1, 3 ],
      component: ZoneNames
    },
    {
      id: 5,
      roles: [ 'all' ],
      component: FaultAnalysis
    },
    {
      id: 6,
      roles: [ 'all' ],
      component: WiringAnalysis
    },
    {
      id: 8,
      roles: [ 1, 3 ],
      component: MaterialDatabaseCard
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user && $user.role))

  let edit = false

</script>

<Screen title={$_('Hot Runner')} back='/'>
  <div slot="tasks">
    <ZoneTasks />
  </div>


  <div class='hot-runner-dash'>

    <div class='zone-summary-container'>
      <div class='zone-summary-title'>
        {$_('Zone Summary')}
      </div>
      <div class='summary'>
        <Summary />
      </div>
    </div>

    <div class='dashboard-container'>
      <CardSet dashboard='hot_runner' {edit} />
      <EditBar dashboard='hot_runner' bind:edit />
    </div>


    <!-- <DataVis />
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each} -->
  </div>
</Screen>


<style>
  .dashboard-container {
    position: relative;
    padding-bottom: 60px;
  }
  .zone-summary-container {
    height: 180px;
    border-radius: 2px;
    background-color: #F5F6F9;
    grid-column: span 4 / auto;
  }

  .zone-summary-title{
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 0;
    line-height: 30px;
    padding: 11px 10px 20px 19px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 0 20px;
  }
</style>
