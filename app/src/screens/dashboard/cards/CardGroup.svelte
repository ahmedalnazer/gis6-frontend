<script>
  import Sortable from "components/Sortable.svelte"
  import Card from "./Card.svelte"
  import { updateOrder, getOrder } from 'data/dashboards'

  export let dashboard = ''
  export let group = ''
  export let cards = []
  export let edit = false

  const sort = e => {
    updateOrder({ group: group.name, dashboard, order: e.detail })
    // console.log(e.detail, group, dashboard)
  }

  $: props = card => {
    let p = { ...card, edit, dashboard, group: group.name }
    const ignored = [ 'component', 'enabled', 'roles' ]
    for(let prop of ignored) {
      delete p[prop]
    }
    return p
  }
</script>

<Sortable class='dashboard-card-group' {edit} on:change={sort} order={$getOrder({ dashboard, group })}>
  {#each cards as card (card.name)}
    <!-- <div class='card-wrapper' data-id={card.name}> -->
      {#if card.component}
        <Card {...props(card)} >
          <svelte:component this={card.component} />
        </Card>
      {:else}
        <Card {...props(card)} />
      {/if}

  {/each}
</Sortable>

<style>
  :global(.dashboard-card-group) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
</style>
