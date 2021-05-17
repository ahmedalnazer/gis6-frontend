<script>
  import _ from 'data/language'
  import CheckBox from "components/input/CheckBox.svelte"
  import { dashboardData } from 'data/dashboards/dashboard-data'
  import { enabled as _enabled } from 'data/dashboards/enabled'
  import DashboardOption from 'screens/dashboard/DashboardOption.svelte'


  const getCards = group => Object.entries(group.cards)
    .map(([ name, card ]) => ({ ...card, name }))
    .filter(x => !x.mandatory && !x.unrestricted)

  const getGroups = data => {
    if(!data) return []
    return Object.entries(data).map(([ name, group ]) => {
      return { ...group, name, cards: getCards(group) }
    }).filter(x => x.cards && x.cards.length)
  }

  let groups = {}
  export let enabled = {}

  $: {
    enabled = $_enabled || enabled
  }

  $: {
    for(let key of Object.keys($dashboardData)) {
      groups[key] = getGroups($dashboardData[key])
    }

    // set defaults if needed
    for(let dashboard of Object.keys(groups)) {
      if(!enabled[dashboard]) enabled[dashboard] = {}
      for(let group of groups[dashboard]) {
        if(!enabled[dashboard][group.name]) {
          enabled[dashboard][group.name] = {}
        }
        for(let card of group.cards) {
          if(card.mandatory) {
            enabled[dashboard][group.name][card.name] = card.enabled
          } else {
            enabled[dashboard][group.name][card.name] = enabled[dashboard][group.name][card.name] !== false
          }
        }
      }
    }
  }

  $: console.log(groups, enabled)

  const getFields = (dashboard, group) => {
    return enabled[dashboard][group] && Object.entries(enabled[dashboard][group]) || []
  }

  $: hasSelected = enabled ? (dashboard, group) => {
    const fields = getFields(dashboard, group)
    const selected = fields.filter(([ card, isEnabled ]) => isEnabled)
    const all = selected.length == fields.length
    return {
      all,
      some: selected.length > 0 && !all,
    }
  } : () => false


  $: dashboardTitles = {
    main: $_('Home Screen'),
    hot_runner: $_('Hotrunner Dashboard')
  }

  const toggleGroup = (dashboard, group) => {
    const fields = getFields(dashboard, group)
    const { some, all } = hasSelected(dashboard, group)
    for(let [ card, isEnabled ] of fields) {
      enabled[dashboard][group][card] = !(some || all)
    }
  }
</script>


{#if $dashboardData && enabled && groups}
  {#each Object.keys(groups) as dashboard}
    {#each groups[dashboard] as group}
      <div class='section'>
        <h2>
          <CheckBox
            label={`${dashboardTitles[dashboard]} ${group.title}`}
            checked={hasSelected(dashboard, group.name).all}
            minus={hasSelected(dashboard, group.name).some}
            on:click={() => toggleGroup(dashboard, group.name)}
          />
        </h2>

        <div class='cards'>
          {#each group.cards as card}
            <DashboardOption {card} bind:checked={enabled[dashboard][group.name][card.name]} />
          {/each}
        </div>
      </div>
    {/each}
  {/each}

  <div class='card-pref-container'></div>
{/if}


<style lang="scss">
  .section {
    border-bottom: 3px solid var(--darkGray);
    padding-bottom: 10px;
  }

  p {
    margin-top: 0;
  }

  .cards {
    padding-left: 30px;
    display: flex;
    flex-direction: column;
  }

</style>
