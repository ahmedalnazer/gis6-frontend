<script>
  import Screen from 'layout/Screen.svelte'
  import Minicontroller from './cards/Minicontroller.svelte'
  import ZoneTasks from "components/taskbars/ZoneTasks.svelte"
  import FaultAnalysis from './cards/FaultAnalysis.svelte'
  import WiringAnalysis from './cards/WiringAnalysis.svelte'
  import EasyScreen from './cards/EasyScreen.svelte'
  import ZoneNames from './cards/ZoneNames.svelte'
  import user, { roles } from 'data/user'
  import _ from 'data/language'
  import LinePlotCard from './cards/LinePlotCard.svelte'
  import MaterialDatabaseCard from './cards/MaterialDatabaseCard.svelte'
  import GroupManagement from './cards/GroupManagement.svelte'

  // USER_TYPE_CHOICES = ((1, "admin"), (2, "operator"), (3, "process_engineer"), (4, "setup"), (5, "plant_manager") )
  let cards = [
    {
      id: 1,
      roles: [ 'all' ],
      component: Minicontroller
    },
    {
      id: 2,
      roles: [ 'all' ],
      component: EasyScreen
    },
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
      id: 7,
      roles: [ 'all' ],
      component: LinePlotCard
    },
    {
      id: 8,
      roles: [ 1, 3 ],
      component: MaterialDatabaseCard
    }
  ]

  $: availableCards = cards.filter(x => x.roles.includes('all') || x.roles.includes($user && $user.role))

</script>

<Screen title={$_('Hot Runner')} back='/'>
  <div slot="tasks">
    <ZoneTasks />
  </div>
  
  <div class='hot-runner-dash card-grid'>
    {#each availableCards as card (card.id)}
      <svelte:component this={card.component} />
    {/each}
    <!-- <Minicontroller />
    <EasyScreen />
    {#if showZoneNames}
      <ZoneNames />
    {/if}
    <FaultAnalysis />
    <WiringAnalysis />
    <LinePlotCard /> -->
  </div>
</Screen>