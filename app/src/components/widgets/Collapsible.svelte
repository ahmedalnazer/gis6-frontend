<script>
  import { onDestroy, tick } from 'svelte'
  export let open = false
  export let horizontal = false

  let inner
  let outer

  let _open = open
  let animatorTimeout = null
  let animating = false
  let max = 0

  let transitioning = false

  const transition = async () => {
    if(inner) {
      if(animatorTimeout) clearTimeout(animatorTimeout)
      max = horizontal ? inner.scrollWidth : inner.offsetHeight + 32
      animating = true
      await tick()
      setTimeout(() => {
        animatorTimeout = setTimeout(() => animating = false, 500)
        _open = !!open
      }, 100)
    }
  }

  $: {
    if(_open != !!open) {
      transition()
    }
  }
  $: h = !horizontal ? `${_open ? max : 0}px` : 'initial'
  $: w = horizontal ? `${_open ? max : 0}px` : 'initial'
  let style
  $: {
    style = animating ? `max-height: ${h}; max-width: ${w}` : ''
    if( horizontal && !animating && open) {
      style = `max-width: ${max}px`
    }
  }
</script>

<div
  class='outer-collapsible'
  class:horizontal
  class:open
  class:animating
  class:closed={!animating && !open}
  {style}
  bind:this={outer}
>
  <div class='inner-collapsible {$$restProps.class || ''}' bind:this={inner}>
    <slot />
  </div>
</div>


<style>
  .outer-collapsible, .inner-collapsible {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    /* border: .1px solid transparent; */
  }
  .outer-collapsible {
    transition: max-height .5s, max-width .5s;
  }
  .outer-collapsible.closed {
    max-height: 0px;
  }
  .outer-collapsible.horizontal.closed {
    max-height: unset;
    max-width: 0px;
  }
  .outer-collapsible.animating, .outer-collapsible.closed {
    overflow: hidden;
  }
</style>
