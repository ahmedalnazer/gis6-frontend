<script>
  import { createEventDispatcher, tick } from 'svelte'
  import Sortable from 'sortablejs'

  const dispatch = createEventDispatcher()

  export let order = []
  export let handle = ''
  export let edit = true
  export let animation = 150
  export let swapThreshold = .75

  let sortList, sortable

  const resetSortable = async (sortList, order) => {
    if(sortList) {
      await tick()
      if(sortable) sortable.destroy()
      sortable = Sortable.create(sortList, {
        store: {
          get: s => order,
          set: s => {
            order = s.toArray()
            dispatch('change', order)
          }
        },
        animation,
        swapThreshold,
        handle
      })
    }
  }

  $: resetSortable(sortList, order)


  let resetting = false
  const resetDOM = async () => {
    resetting = true
    setTimeout(() => {
      resetting = false
    }, 1000)
    // await tick()
    // resetting = false
  }

  $: {
    if(sortable) sortable.option('disabled', !edit)
  }
</script>

{#if !resetting}
  <div class='sort-list {$$restProps.class}' bind:this={sortList}>
    <slot />
  </div>
{/if}
