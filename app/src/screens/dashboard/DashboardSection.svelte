<script>
  import DragHeading from 'components/DragHeading.svelte'
  import CardGroup from './cards/CardGroup.svelte'

  export let title
  export let cards = []
  export let id = ''
  export let edit = false
  export let dashboard
  export let group
</script>


{#if cards.length}
  <div class='dashboard-section' data-id={id}>
    <DragHeading>{title}</DragHeading>

    <div class="section-body">
      <slot />
      {#if cards.length > 0}
        <CardGroup cards={cards} {dashboard} {group} {edit}/>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dashboard-section {
    margin-bottom: 32px;
  }
</style>
