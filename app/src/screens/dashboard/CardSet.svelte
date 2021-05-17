<script>
  import Sortable from "components/Sortable.svelte"
  import DashboardSection from './DashboardSection.svelte'
  import dashboards, { updateOrder, getOrder } from 'data/dashboards'

  export let dashboard = ''
  export let edit = false

  $: dashData = $dashboards[dashboard]

  $: console.log(dashData)

  const sort = e => updateOrder({ order: e.detail, dashboard })

</script>

{#if dashData}
  <Sortable class='dashboard-cards' handle='.drag-header' {edit} order={$getOrder({ dashboard })} on:change={sort}>
    {#each dashData.groups as group (group.name)}
      <DashboardSection group={group} id={group.name} title={group.title} cards={group.cards} {edit} {dashboard} />
    {/each}
  </Sortable>
{/if}
